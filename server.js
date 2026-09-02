/**
 * server.js
 * ------------------------------------------------------------------
 * Servidor de DESARROLLO del sitio de Turismo sobre Ruedas.
 *
 * En producción el sitio se publica en Netlify como archivos estáticos
 * y este archivo NO se ejecuta: las cabeceras de seguridad de allí se
 * declaran en `netlify.toml`. Ambos deben mantenerse en paralelo, y por
 * eso este servidor aplica exactamente la misma política: lo que se ve
 * en local es lo que habrá en producción.
 *
 * Sirve el sitio estático de /public con:
 *   - Cabeceras de seguridad (helmet) y política de contenido acotada
 *   - Compresión gzip/brotli
 *   - Caché larga para imágenes, CSS y JS; sin caché para el HTML
 *   - Registro de peticiones en desarrollo
 *   - Página 404 y manejo de errores
 *
 * Arranque:  npm start        → http://localhost:3000
 *            npm run dev      → recarga al guardar cambios
 * ------------------------------------------------------------------
 */

'use strict';

const path = require('node:path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ---------- Seguridad --------------------------------------------- */

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // El sitio es autónomo: no carga scripts, estilos, tipografías
        // ni imágenes de terceros. Todo se cierra a 'self'.
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        // upgrade-insecure-requests rompería http://localhost.
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    // Mismo valor que netlify.toml.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    // Permite que las imágenes se muestren si el sitio se embebe en previews.
    crossOriginEmbedderPolicy: false,
  })
);

// Cabeceras que helmet no cubre y que sí declara netlify.toml.
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

/* ---------- Middleware general ------------------------------------ */

app.use(compression());
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

/* ---------- Archivos estáticos ------------------------------------ */

/**
 * Los recursos con nombre estable (imágenes, css, js) se cachean un año;
 * el HTML nunca, para que un cambio de texto se vea de inmediato.
 */
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    index: 'index.html',
    setHeaders(res, filePath) {
      if (/\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(?:css|js)$/i.test(filePath)) {
        res.setHeader('Cache-Control', IS_PROD ? 'public, max-age=604800' : 'no-cache');
      } else if (/\.html?$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

/* ---------- Rutas de servicio -------------------------------------- */

// Sonda de salud, útil al desplegar.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

/* ---------- 404 y errores ------------------------------------------ */

app.use((req, res) => {
  res.status(404);
  if (req.accepts('html')) {
    res.sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
      if (err) res.type('txt').send('404 — Página no encontrada');
    });
    return;
  }
  res.type('txt').send('404 — Página no encontrada');
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).type('txt').send('500 — Error interno del servidor');
});

/* ---------- Arranque ------------------------------------------------ */

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Turismo sobre Ruedas');
  console.log('  ────────────────────────────────────────');
  console.log(`  Sitio disponible en:  http://localhost:${PORT}`);
  console.log(`  Entorno:              ${IS_PROD ? 'producción' : 'desarrollo'}`);
  console.log('  Producción:           Netlify (estático, ver netlify.toml)');
  console.log('  Detener:              Ctrl + C');
  console.log('');
});

// Cierre ordenado (Ctrl+C, docker stop, etc.)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
