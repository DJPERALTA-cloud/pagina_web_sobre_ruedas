/**
 * fetch-fonts.js
 * ------------------------------------------------------------------
 * Descarga las tipografías del sitio desde Google Fonts y las guarda
 * en public/fonts/ para servirlas desde el propio dominio.
 *
 * Por qué autoalojar:
 *   - Una petición a un tercero menos en cada visita (más rápido).
 *   - El sitio no depende de que Google esté disponible.
 *   - La IP del visitante no viaja a Google (privacidad).
 *   - Permite cerrar la Content-Security-Policy a 'self'.
 *
 * Bricolage Grotesque (Mathieu Triay) y Archivo (Omnibus-Type) se
 * publican bajo la SIL Open Font License 1.1, que permite alojarlas y
 * redistribuirlas.
 *
 * Solo se baja el subconjunto "latin": cubre el español completo
 * (incluidos á é í ó ú ñ ü ¿ ¡), la puntuación tipográfica y el signo
 * de euro. Cada archivo ronda los 15 kB.
 *
 * Uso:  npm run fonts     (solo hace falta si se cambia la tipografía)
 * ------------------------------------------------------------------
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');

const OUT_DIR = path.join(__dirname, '..', 'public', 'fonts');

// Google Fonts sirve woff2 solo a navegadores que lo soportan.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FAMILIES = [
  // Titulares.
  { google: 'Bricolage Grotesque', slug: 'bricolage', weights: [700, 800] },
  // Texto e interfaz.
  { google: 'Archivo', slug: 'archivo', weights: [400, 500, 600] },
];

/** Extrae los @font-face del subconjunto latin de la hoja de Google. */
function parseLatinFaces(css) {
  const faces = [];
  const blocks = css.split('@font-face').slice(1);

  for (const block of blocks) {
    // El bloque latin es el unico cuyo unicode-range arranca en U+0000.
    if (!/unicode-range:\s*U\+0000-00FF/.test(block)) continue;

    const weight = block.match(/font-weight:\s*(\d+)/);
    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (weight && url) faces.push({ weight: Number(weight[1]), url: url[1] });
  }
  return faces;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let total = 0;

  for (const family of FAMILIES) {
    const query = new URLSearchParams({
      family: `${family.google}:wght@${family.weights.join(';')}`,
      display: 'swap',
    });

    const res = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) throw new Error(`Google Fonts respondió ${res.status} para ${family.google}`);

    const faces = parseLatinFaces(await res.text());
    const found = faces.map((f) => f.weight).sort();
    const missing = family.weights.filter((w) => !found.includes(w));
    if (missing.length) throw new Error(`Faltan los pesos ${missing.join(', ')} de ${family.google}`);

    for (const face of faces) {
      const file = `${family.slug}-${face.weight}.woff2`;
      const bin = await fetch(face.url, { headers: { 'User-Agent': UA } });
      if (!bin.ok) throw new Error(`No se pudo descargar ${file} (${bin.status})`);

      const buf = Buffer.from(await bin.arrayBuffer());
      await fs.writeFile(path.join(OUT_DIR, file), buf);
      total += buf.length;
      console.log(`✔ ${file.padEnd(28)} ${(buf.length / 1024).toFixed(1)} kB`);
    }
  }

  console.log(`\nListo. ${(total / 1024).toFixed(0)} kB de tipografías en public/fonts/.`);
}

main().catch((err) => {
  console.error('Error descargando tipografías:', err.message);
  process.exitCode = 1;
});
