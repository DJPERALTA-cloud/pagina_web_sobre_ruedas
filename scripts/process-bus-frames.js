/**
 * process-bus-frames.js
 * ------------------------------------------------------------------
 * Convierte los 36 renders del autobús (1200×1200, fondo blanco puro)
 * en los PNG con transparencia que usa el giro del hero:
 * public/turn/g01.png … g36.png, a 520×520.
 *
 * El problema de fondo
 * --------------------
 * Midiendo los píxeles de los renders aparecen dos hechos que
 * condicionan todo el algoritmo:
 *
 *   1. Las caras iluminadas de la carrocería son 255,255,255 EXACTO,
 *      igual que el fondo. Un relleno por inundación que solo mire el
 *      color se cuela por ahí y muerde el techo y los costados.
 *
 *   2. La carrocería y la sombra proyectada comparten EXACTAMENTE el
 *      mismo rango de gris (205–250). Se comprobó pintando una máscara
 *      sobre el render: el mismo criterio de color marca a la vez el
 *      techo, el costado y la sombra del suelo. Por color no se pueden
 *      separar de ninguna manera.
 *
 * De ahí las dos defensas del recorte:
 *
 *   a) BARRERA DE CONTORNO. Antes de rellenar se dilatan 2 px todos los
 *      píxeles que no son blanco puro. El relleno del fondo no puede
 *      atravesar esa barrera, así que los puntos donde la carrocería
 *      toca el fondo quedan sellados. Deja un reborde de 2 px que luego
 *      se repinta de verde: invisible.
 *
 *   b) SOMBRA POR GEOMETRÍA DE COLUMNA. Para cada columna de píxeles se
 *      busca el elemento oscuro más bajo del vehículo (faldón, llanta,
 *      parachoques). Todo gris claro que quede por debajo de esa línea
 *      es suelo, no carrocería. En las columnas donde no hay nada del
 *      vehículo, todo el gris es sombra. Es el único criterio que
 *      separa bien las dos cosas, porque el vehículo siempre apoya
 *      sobre algo oscuro y la sombra siempre nace por debajo.
 *
 * Después se repinta cada píxel opaco con la paleta del sitio. La
 * sombra del suelo NO se reconstruye aquí: va en CSS, negra y
 * difuminada, para que pueda seguir al autobús durante la animación.
 *
 * Uso:  npm run frames
 *       npm run frames -- --diagnostico     (tira de contactos)
 * ------------------------------------------------------------------
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'src', 'bus-frames');
const OUT_DIR = path.join(__dirname, '..', 'public', 'turn');
const DIAG_DIR = path.join(__dirname, '..', 'src', 'diagnostico');

const OUT_SIZE = 720;
const DIAGNOSTICO = process.argv.includes('--diagnostico');

/* ---------- Parámetros ------------------------------------------- */

const AJUSTES = {
  // Grosor de la barrera que sella el contorno del vehículo. A 2 px
  // quedaban mordiscos en el techo: la compresión WebP abre caminos de
  // blanco puro de 2–3 px por los que se colaba el relleno.
  barrera: 3,

  // Suavizado del borde. La máscara sale binaria y el filo queda
  // dentado; un desenfoque corto del canal alfa le da el antialiasing
  // que el recorte no puede producir por sí solo.
  suavizadoBorde: 1.1,
  sangradoColor: 4,

  // Núcleo del vehículo: píxeles con color o claramente oscuros
  // (cristales, llantas, faldón, molduras, espejos, faros).
  nucleoSaturacion: 12,
  nucleoLuminancia: 0.72,

  // Margen bajo el núcleo más bajo de cada columna. Sube el corte para
  // no morder el parachoques; baja para apurar más la sombra.
  margenBase: 8,

  // Por debajo de la base del vehículo ya no hay carrocería, así que
  // ahí se puede ser agresivo: cualquier gris neutro que no sea muy
  // oscuro es suelo. El umbral bajo es lo que borra también el contorno
  // difuminado del trapecio de sombra, no solo su interior.
  sombraMin: 150,
  sombraSaturacionMax: 18,

  // Manchas opacas sueltas más pequeñas que esto se descartan.
  minComponente: 400,
};

/* ---------- Paleta ------------------------------------------------ */
/*
 * Rampa calibrada contra los renders reales. Dos ajustes respecto a la
 * primera versión:
 *
 *   - El verde bajó de tono. Con #82C4A6 en las caras iluminadas el
 *     autobús quedaba mucho más claro que cualquier otra cosa de la
 *     página y se leía como un recorte pegado encima. Ahora la rampa
 *     llega a #5A947C: sigue destacando sobre el fondo #0A241D, pero
 *     pertenece a la misma familia de verdes que el resto del sitio.
 *
 *   - Los cristales suben un punto respecto al fondo (#10261F) para que
 *     se lean como cristales y no como agujeros recortados.
 */
const PALETA = {
  ambar: [214, 92, 40], // #D65C28 — faros e intermitentes, algo apagados
  verdeSombra: [22, 56, 45], // #16382D — caras en sombra
  verdeLuz: [90, 148, 124], // #5A947C — caras iluminadas
  negro: [16, 38, 31], // #10261F — cristales y llantas
  corteOscuro: 0.3,
};

/* ---------- Utilidades -------------------------------------------- */

const luminancia = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const saturacion = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);

/** Relleno por inundación de 4 vecinos con registro propio de visitados. */
function inundar(W, H, fuera, semillas, aceptar) {
  const visitado = new Uint8Array(W * H);
  const pila = new Int32Array(W * H);
  let tope = 0;

  for (const i of semillas) {
    if (!visitado[i]) {
      visitado[i] = 1;
      pila[tope++] = i;
    }
  }

  const empujar = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (visitado[i]) return;
    visitado[i] = 1;
    if (!aceptar(i, x, y)) return;
    fuera[i] = 1;
    pila[tope++] = i;
  };

  while (tope > 0) {
    const i = pila[--tope];
    const x = i % W;
    const y = (i / W) | 0;
    empujar(x + 1, y);
    empujar(x - 1, y);
    empujar(x, y + 1);
    empujar(x, y - 1);
  }
}

/** Dilata una máscara binaria por distancia de Chebyshev (cuadrada). */
function dilatar(mascara, W, H, radio) {
  // Separable: una pasada horizontal y otra vertical.
  const paso1 = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const fila = y * W;
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -radio; k <= radio && !v; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < W && mascara[fila + xx]) v = 1;
      }
      paso1[fila + x] = v;
    }
  }
  const salida = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let v = 0;
      for (let k = -radio; k <= radio && !v; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < H && paso1[yy * W + x]) v = 1;
      }
      salida[y * W + x] = v;
    }
  }
  return salida;
}

/** Descarta manchas opacas sueltas (ruido del render y de la compresión). */
function limpiarManchas(fuera, W, H, minimo) {
  const visitado = new Uint8Array(W * H);
  const pila = new Int32Array(W * H);
  let descartadas = 0;

  for (let s = 0; s < W * H; s++) {
    if (fuera[s] || visitado[s]) continue;
    let tope = 0;
    pila[tope++] = s;
    visitado[s] = 1;
    const grupo = [];

    while (tope > 0) {
      const i = pila[--tope];
      grupo.push(i);
      const x = i % W;
      const y = (i / W) | 0;
      const vecinos = [
        x + 1 < W ? i + 1 : -1,
        x - 1 >= 0 ? i - 1 : -1,
        y + 1 < H ? i + W : -1,
        y - 1 >= 0 ? i - W : -1,
      ];
      for (const v of vecinos) {
        if (v < 0 || visitado[v] || fuera[v]) continue;
        visitado[v] = 1;
        pila[tope++] = v;
      }
    }

    if (grupo.length < minimo) {
      for (const i of grupo) fuera[i] = 1;
      descartadas++;
    }
  }
  return descartadas;
}

/**
 * Propaga el color de los píxeles opacos hacia los transparentes
 * vecinos, sin tocar su alfa. Prepara el terreno para desenfocar el
 * borde sin que aparezca una orla negra.
 */
function sangrarColor(rgba, fuera, W, H, pasos) {
  let frontera = new Uint8Array(fuera); // 1 = aún sin color
  for (let paso = 0; paso < pasos; paso++) {
    const nueva = new Uint8Array(frontera);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!frontera[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        const vecinos = [
          x + 1 < W ? i + 1 : -1,
          x - 1 >= 0 ? i - 1 : -1,
          y + 1 < H ? i + W : -1,
          y - 1 >= 0 ? i - W : -1,
        ];
        for (const v of vecinos) {
          if (v < 0 || frontera[v]) continue;
          r += rgba[v * 4];
          g += rgba[v * 4 + 1];
          b += rgba[v * 4 + 2];
          n++;
        }
        if (!n) continue;
        rgba[i * 4] = Math.round(r / n);
        rgba[i * 4 + 1] = Math.round(g / n);
        rgba[i * 4 + 2] = Math.round(b / n);
        nueva[i] = 0;
      }
    }
    frontera = nueva;
  }
}

/* ---------- Procesado de un frame --------------------------------- */

async function procesarFrame(archivo) {
  const { data, info } = await sharp(archivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const N = W * H;

  const esBlancoPuro = (i) => {
    const p = i * 3;
    return data[p] === 255 && data[p + 1] === 255 && data[p + 2] === 255;
  };

  /* --- 1. Barrera: contorno del vehículo, engrosado ---------------- */
  const noBlanco = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!esBlancoPuro(i)) noBlanco[i] = 1;
  const barrera = dilatar(noBlanco, W, H, AJUSTES.barrera);

  /* --- 2. Fondo: blanco puro que no toque la barrera --------------- */
  const fuera = new Uint8Array(N);
  const semillasBorde = [];
  for (let x = 0; x < W; x++) {
    semillasBorde.push(x, (H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    semillasBorde.push(y * W, y * W + W - 1);
  }
  for (const i of semillasBorde) if (!barrera[i]) fuera[i] = 1;

  inundar(W, H, fuera, semillasBorde, (i) => !barrera[i] && esBlancoPuro(i));

  /* --- 3. Base del vehículo, columna a columna --------------------- */
  // El píxel oscuro más bajo de cada columna marca dónde apoya el
  // vehículo. Por debajo de esa línea ya no hay carrocería.
  const baseY = new Int32Array(W).fill(-1);
  for (let i = 0; i < N; i++) {
    if (fuera[i]) continue;
    const p = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (saturacion(r, g, b) >= AJUSTES.nucleoSaturacion || luminancia(r, g, b) < AJUSTES.nucleoLuminancia) {
      const x = i % W;
      const y = (i / W) | 0;
      if (y > baseY[x]) baseY[x] = y;
    }
  }

  /* --- 4. Sombra: gris claro por debajo de la base ----------------- */
  let sombraPx = 0;
  for (let i = 0; i < N; i++) {
    if (fuera[i]) continue;
    const x = i % W;
    const y = (i / W) | 0;
    // Columna sin vehículo: cualquier gris de ahí es suelo.
    if (baseY[x] >= 0 && y <= baseY[x] + AJUSTES.margenBase) continue;
    const p = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (saturacion(r, g, b) > AJUSTES.sombraSaturacionMax) continue;
    if ((r + g + b) / 3 >= AJUSTES.sombraMin) {
      fuera[i] = 1;
      sombraPx++;
    }
  }

  /* --- 5. Limpieza de manchas sueltas ------------------------------ */
  const manchas = limpiarManchas(fuera, W, H, AJUSTES.minComponente);

  /* --- 6. Repintado con la paleta del sitio ------------------------ */
  const salida = Buffer.alloc(N * 4);
  let opacos = 0;
  let left = W, top = H, right = -1, bottom = -1;

  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (fuera[i]) {
      salida[o + 3] = 0;
      continue;
    }
    opacos++;
    const x = i % W;
    const y = (i / W) | 0;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;

    const p = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const L = luminancia(r, g, b);
    let color;

    if (r > 150 && b < r - 40) {
      color = PALETA.ambar;
    } else if (L > PALETA.corteOscuro) {
      const t = Math.min(1, (L - PALETA.corteOscuro) / (1 - PALETA.corteOscuro));
      color = [
        Math.round(PALETA.verdeSombra[0] + t * (PALETA.verdeLuz[0] - PALETA.verdeSombra[0])),
        Math.round(PALETA.verdeSombra[1] + t * (PALETA.verdeLuz[1] - PALETA.verdeSombra[1])),
        Math.round(PALETA.verdeSombra[2] + t * (PALETA.verdeLuz[2] - PALETA.verdeSombra[2])),
      ];
    } else {
      color = PALETA.negro;
    }

    salida[o] = color[0];
    salida[o + 1] = color[1];
    salida[o + 2] = color[2];
    salida[o + 3] = 255;
  }

  /* --- 7. Sangrado de color y borde suave ------------------------- */
  // El desenfoque del alfa mezcla el borde con lo que haya debajo. Si
  // los píxeles transparentes siguen en negro, aparece una orla oscura.
  // Se propaga antes el color del vecino opaco hacia fuera.
  sangrarColor(salida, fuera, W, H, AJUSTES.sangradoColor);

  return {
    buffer: salida,
    width: W,
    height: H,
    cobertura: opacos / N,
    sombraPx,
    manchas,
    caja: { left, top, right, bottom },
  };
}

/* ---------- Programa ---------------------------------------------- */

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Se procesan todos los renders que haya, no un número fijo: si algún
  // día se exporta el giro con 72 o 120 frames, basta con dejarlos aquí.
  const archivos = (await fs.readdir(SRC_DIR))
    .filter((f) => /^bus_[0-9]+\.(webp|png|jpe?g)$/i.test(f))
    .sort()
    .map((f) => path.join(SRC_DIR, f));

  if (!archivos.length) throw new Error('No hay renders en src/bus-frames/');
  const TOTAL_FRAMES = archivos.length;

  console.log(
    `Procesando ${TOTAL_FRAMES} frames (${(360 / TOTAL_FRAMES).toFixed(1)} grados por paso)…`
  );
  const procesados = [];
  for (let n = 0; n < archivos.length; n++) {
    const r = await procesarFrame(archivos[n]);
    procesados.push(r);
    process.stdout.write(
      `  ${String(n + 1).padStart(2, '0')}/${TOTAL_FRAMES}  ` +
        `silueta ${(r.cobertura * 100).toFixed(1)}%  ` +
        `sombra ${(r.sombraPx / 1000).toFixed(0)}k px  ` +
        `manchas ${r.manchas}   \r`
    );
  }
  console.log('\n');

  /* Caja cuadrada común: el autobús no debe saltar entre frames. */
  const u = procesados.reduce(
    (a, p) => ({
      left: Math.min(a.left, p.caja.left),
      top: Math.min(a.top, p.caja.top),
      right: Math.max(a.right, p.caja.right),
      bottom: Math.max(a.bottom, p.caja.bottom),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  );

  const W = procesados[0].width;
  const H = procesados[0].height;
  const margen = 24;
  const cx = (u.left + u.right) / 2;
  const cy = (u.top + u.bottom) / 2;
  const lado = Math.min(W, H, Math.max(u.right - u.left, u.bottom - u.top) + margen * 2);
  const left = Math.max(0, Math.min(W - lado, Math.round(cx - lado / 2)));
  const top = Math.max(0, Math.min(H - lado, Math.round(cy - lado / 2)));

  console.log(`Silueta común: ${u.right - u.left + 1}×${u.bottom - u.top + 1} px`);
  console.log(`Recorte: ${lado}×${lado} en (${left}, ${top}) → ${OUT_SIZE}×${OUT_SIZE}\n`);

  let total = 0;
  const miniaturas = [];
  for (let n = 0; n < procesados.length; n++) {
    const p = procesados[n];
    // El alfa se desenfoca por separado: da el filo antialiaseado que
    // la máscara binaria no puede producir.
    const recorte = sharp(p.buffer, { raw: { width: p.width, height: p.height, channels: 4 } })
      .extract({ left, top, width: lado, height: lado });

    const color = await recorte.clone().removeAlpha().raw().toBuffer();
    const alfa = await recorte
      .clone()
      .extractChannel(3)
      .blur(AJUSTES.suavizadoBorde)
      .raw()
      .toBuffer();

    // Ojo: sharp aplica el resize ANTES que joinChannel dentro de su
    // pipeline, sin importar el orden de las llamadas. Si se encadenan,
    // el alfa llega con un tamaño y la imagen con otro y el resultado
    // sale corrupto. Por eso se materializa el RGBA y luego se escala.
    const rgba = await sharp(color, { raw: { width: lado, height: lado, channels: 3 } })
      .joinChannel(alfa, { raw: { width: lado, height: lado, channels: 1 } })
      .raw()
      .toBuffer();

    const png = sharp(rgba, { raw: { width: lado, height: lado, channels: 4 } })
      .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } });

    // Los frames son planos —una rampa de verdes, negro y naranja—, así
    // que una paleta indexada de 128 colores los deja casi a un tercio
    // del peso sin diferencia visible. Importa: los 36 se cargan de
    // inmediato para que el giro no parpadee la primera vez.
    const info = await png
      .clone()
      .png({ compressionLevel: 9, palette: true, colours: 128, effort: 10 })
      .toFile(
      path.join(OUT_DIR, `g${String(n + 1).padStart(2, '0')}.png`)
    );
    total += info.size;

    if (DIAGNOSTICO) miniaturas.push(await png.clone().resize(200, 200).png().toBuffer());
  }

  if (DIAGNOSTICO) {
    await fs.mkdir(DIAG_DIR, { recursive: true });
    await sharp({ create: { width: 1200, height: 1200, channels: 4, background: '#0A241D' } })
      .composite(miniaturas.map((b, i) => ({ input: b, left: (i % 6) * 200, top: Math.floor(i / 6) * 200 })))
      .png()
      .toFile(path.join(DIAG_DIR, 'frames.png'));
    console.log('Tira de contactos en src/diagnostico/frames.png');
  }

  console.log(
    `Listo. ${TOTAL_FRAMES} frames en public/turn/ · ${(total / 1024).toFixed(0)} kB ` +
      `(${(total / TOTAL_FRAMES / 1024).toFixed(1)} kB de media)`
  );
  console.log(
    `\nSi el total cambió, actualiza data-total="${TOTAL_FRAMES}" ` +
      'en el contenedor [data-frames] de index.html.'
  );
}

main().catch((err) => {
  console.error('Error procesando los frames:', err.message);
  process.exitCode = 1;
});
