/**
 * process-images.js
 * ------------------------------------------------------------------
 * Convierte las fotografías originales de las unidades (capturas
 * verticales) en los recortes y formatos que consume el sitio.
 *
 * Para cada pieza se genera:
 *   - WebP (formato principal, servido por <picture>)
 *   - JPG  (respaldo para navegadores antiguos)
 *   - Una versión @2x cuando la resolución de origen lo permite
 *
 * Tratamiento estético aplicado a todas las fotos para que las cuatro
 * unidades se vean como una sola serie fotográfica coherente:
 *   1. Recorte con punto focal vertical ajustado a cada vehículo
 *   2. Ajuste de saturación / brillo
 *   3. Curva de contraste lineal
 *   4. Enfoque (compensa el reescalado de las capturas)
 *   5. Veladura cálida en modo "soft-light" que alinea las fotos con
 *      la paleta arena/verde del sitio
 *
 * Uso:  npm run images
 * ------------------------------------------------------------------
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'src', 'photos');
const OUT_DIR = path.join(__dirname, '..', 'public', 'img');

/* ---------- Tratamiento de color compartido ------------------------ */

// Veladura cálida (color acento del sitio) aplicada en soft-light.
const WARM_WASH = { r: 222, g: 150, b: 96, alpha: 0.16 };
// Veladura fría para la toma nocturna: refuerza el azul sin apagar luces.
const COOL_WASH = { r: 90, g: 130, b: 190, alpha: 0.14 };

/**
 * Genera un PNG de un solo color del tamaño pedido, para componer
 * la veladura sobre la fotografía.
 */
function washLayer(width, height, color) {
  return sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

/* ---------- Definición de las piezas del sitio --------------------- */

/**
 * ratio   : proporción del recorte (ancho / alto)
 * focusY  : centro vertical del recorte, 0 = arriba, 1 = abajo
 * width   : ancho de salida base (se genera además @2x si hay píxeles)
 * grade   : ajustes de color específicos de la toma
 */
const PIECES = [
  {
    id: 'hero-unidad',
    src: 'bus-man-blanco.png',
    ratio: 4 / 3,
    focusY: 0.5,
    width: 720,
    grade: { saturation: 1.1, brightness: 1.03, contrast: 1.06, wash: WARM_WASH },
    alt: 'Autobús de turismo blanco de Turismo sobre Ruedas estacionado frente a un hotel',
  },
  {
    id: 'servicio-escolar',
    src: 'bus-amarillo.png',
    ratio: 3 / 2,
    focusY: 0.57,
    width: 640,
    grade: { saturation: 1.12, brightness: 1.03, contrast: 1.07, wash: WARM_WASH },
    alt: 'Autobús amarillo de la flota listo para una salida escolar',
  },
  {
    id: 'servicio-evento',
    src: 'bus-noche-rueda.png',
    ratio: 3 / 2,
    focusY: 0.52,
    width: 640,
    grade: { saturation: 1.16, brightness: 1.02, contrast: 1.09, wash: COOL_WASH },
    alt: 'Unidad de Turismo sobre Ruedas de noche junto a una rueda de la fortuna iluminada',
  },
  {
    id: 'servicio-deportivo',
    src: 'van-crafter.png',
    ratio: 3 / 2,
    focusY: 0.46,
    width: 640,
    grade: { saturation: 1.08, brightness: 1.05, contrast: 1.08, wash: WARM_WASH },
    alt: 'Van de pasajeros de la flota, ideal para grupos deportivos pequeños',
  },

  /* Mosaico de la sección "Unidades": recortes verticales (3:4) */
  {
    id: 'flota-1',
    src: 'bus-man-blanco.png',
    ratio: 3 / 4,
    focusY: 0.5,
    width: 420,
    grade: { saturation: 1.1, brightness: 1.03, contrast: 1.06, wash: WARM_WASH },
    alt: 'Autobús de turismo de la flota',
  },
  {
    id: 'flota-2',
    src: 'bus-amarillo.png',
    ratio: 3 / 4,
    focusY: 0.55,
    width: 420,
    grade: { saturation: 1.12, brightness: 1.03, contrast: 1.07, wash: WARM_WASH },
    alt: 'Autobús amarillo de la flota visto de costado',
  },
  {
    id: 'flota-3',
    src: 'bus-noche-rueda.png',
    ratio: 3 / 4,
    focusY: 0.5,
    width: 420,
    grade: { saturation: 1.18, brightness: 1.08, contrast: 1.05, wash: COOL_WASH },
    alt: 'Unidad de la flota durante un servicio nocturno',
  },
  {
    id: 'flota-4',
    src: 'van-crafter.png',
    ratio: 3 / 4,
    focusY: 0.5,
    width: 420,
    grade: { saturation: 1.08, brightness: 1.05, contrast: 1.08, wash: WARM_WASH },
    alt: 'Van de pasajeros de la flota vista de frente',
  },

  /* Imagen para redes sociales (Open Graph) */
  {
    id: 'og-turismo-sobre-ruedas',
    src: 'bus-man-blanco.png',
    ratio: 1200 / 630,
    focusY: 0.5,
    width: 1200,
    formats: ['jpg'],
    retina: false,
    grade: { saturation: 1.1, brightness: 1.03, contrast: 1.06, wash: WARM_WASH },
    alt: 'Turismo sobre Ruedas',
  },
];

/* ---------- Motor de procesamiento --------------------------------- */

/**
 * Calcula la ventana de recorte más grande posible con la proporción
 * pedida, centrada en el punto focal vertical indicado.
 */
function cropWindow(meta, ratio, focusY) {
  let width = meta.width;
  let height = Math.round(width / ratio);

  if (height > meta.height) {
    height = meta.height;
    width = Math.round(height * ratio);
  }

  const left = Math.round((meta.width - width) / 2);
  const idealTop = Math.round(meta.height * focusY - height / 2);
  const top = Math.min(Math.max(idealTop, 0), meta.height - height);

  return { left, top, width, height };
}

async function renderPiece(piece) {
  const srcPath = path.join(SRC_DIR, piece.src);
  const meta = await sharp(srcPath).metadata();
  const window = cropWindow(meta, piece.ratio, piece.focusY);

  const formats = piece.formats ?? ['webp', 'jpg'];
  // Solo se genera @2x si no hay que inventar más del 40 % de píxeles.
  const allowRetina = piece.retina !== false && window.width >= piece.width * 1.4;
  const scales = allowRetina ? [1, 2] : [1];

  const written = [];

  for (const scale of scales) {
    const targetWidth = Math.min(piece.width * scale, Math.round(window.width * 1.6));
    const targetHeight = Math.round(targetWidth / piece.ratio);
    const { saturation, brightness, contrast, wash } = piece.grade;

    const graded = sharp(srcPath)
      .extract(window)
      .resize(targetWidth, targetHeight, { fit: 'cover', kernel: 'lanczos3' })
      .modulate({ saturation, brightness })
      // Curva de contraste en torno al gris medio.
      .linear(contrast, -(128 * contrast) + 128)
      .sharpen({ sigma: 0.8, m1: 0.6, m2: 2 });

    const layer = await washLayer(targetWidth, targetHeight, wash);
    const base = await graded
      .composite([{ input: layer, blend: 'soft-light' }])
      .toColourspace('srgb')
      .toBuffer();

    const suffix = scale === 2 ? '@2x' : '';

    for (const format of formats) {
      const file = `${piece.id}${suffix}.${format}`;
      const out = sharp(base);
      if (format === 'webp') out.webp({ quality: 82, effort: 6 });
      else out.jpeg({ quality: 84, mozjpeg: true, progressive: true });

      const info = await out.toFile(path.join(OUT_DIR, file));
      written.push({ file, width: info.width, height: info.height, bytes: info.size });
    }
  }

  return { piece, window, written };
}

/** Logotipo: copia optimizada + favicons cuadrados. */
async function renderLogo() {
  const srcPath = path.join(SRC_DIR, 'logo.png');
  const written = [];

  const logo = await sharp(srcPath).resize(184, 184, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, 'logo.png'));
  written.push({ file: 'logo.png', width: logo.width, height: logo.height, bytes: logo.size });

  for (const size of [32, 180, 512]) {
    const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    const info = await sharp(srcPath)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, name));
    written.push({ file: name, width: info.width, height: info.height, bytes: info.size });
  }

  return written;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const manifest = {};
  let total = 0;

  for (const piece of PIECES) {
    const { window, written } = await renderPiece(piece);
    manifest[piece.id] = { alt: piece.alt, files: written };
    for (const w of written) total += w.bytes;
    const list = written.map((w) => `${w.file} ${w.width}×${w.height} ${(w.bytes / 1024).toFixed(0)}kB`).join('  |  ');
    console.log(`✔ ${piece.id.padEnd(24)} recorte ${window.width}×${window.height} @ y=${window.top}`);
    console.log(`  ${list}`);
  }

  const logoFiles = await renderLogo();
  for (const w of logoFiles) total += w.bytes;
  console.log(`✔ ${'logo + favicons'.padEnd(24)} ${logoFiles.map((w) => w.file).join(', ')}`);

  // El inventario se guarda fuera de public/: es un registro de la
  // compilación, no un archivo que deba servirse al navegador.
  await fs.writeFile(
    path.join(__dirname, '..', 'src', 'images.manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  console.log(`\nListo. ${Object.keys(manifest).length} piezas · ${(total / 1024).toFixed(0)} kB en total.`);
}

main().catch((err) => {
  console.error('Error procesando imágenes:', err);
  process.exitCode = 1;
});
