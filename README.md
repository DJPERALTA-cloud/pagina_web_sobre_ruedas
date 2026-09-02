# Turismo sobre Ruedas — sitio web

Sitio de una página para la renta de autobuses de turismo, construido sobre el
mockup aprobado (`docs/mockup-aprobado.html`) y con las fotografías reales de
las unidades ya integradas.

- **Producción:** Netlify, como sitio estático.
- **Desarrollo:** Node.js + Express (`server.js`), con las mismas cabeceras de
  seguridad que producción, para que lo que se ve en local sea lo que se publica.
- **Sin dependencias de terceros en tiempo de ejecución:** tipografías
  autoalojadas, cero peticiones externas.

---

## Cómo verlo en el navegador

```bash
npm install
npm start
```

Después abre **http://localhost:3000**

Para trabajar con recarga automática al guardar cambios:

```bash
npm run dev
```

Cambiar el puerto:

```bash
PORT=8080 npm start
```

### Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta el servidor de desarrollo en el puerto 3000 |
| `npm run dev` | Igual, recargando al guardar cambios |
| `npm run build` | Regenera las imágenes del sitio desde `src/photos/` |
| `npm run fonts` | Vuelve a descargar las tipografías (solo si se cambian) |
| `npm audit` | Revisa vulnerabilidades en las dependencias |

Las imágenes y las tipografías ya están generadas y versionadas: tras
`npm install`, `npm start` funciona sin ningún paso previo.

---

## Estructura del proyecto

```
.
├── netlify.toml               Despliegue: build, cabeceras de seguridad y caché
├── server.js                  Servidor de desarrollo (NO se usa en producción)
├── package.json
├── LICENSE
│
├── .github/workflows/ci.yml   Comprobación automática en cada push
├── .nvmrc  .editorconfig  .gitattributes  .env.example
│
├── docs/
│   ├── README.md              Contexto de diseño
│   └── mockup-aprobado.html   Propuesta original del cliente, sin modificar
│
├── src/photos/                Fotografías originales, sin tocar
│   ├── bus-man-blanco.png
│   ├── bus-amarillo.png
│   ├── bus-noche-rueda.png
│   ├── van-crafter.png
│   └── logo.png
│
├── scripts/
│   ├── process-images.js      Recorta, trata y exporta las imágenes del sitio
│   └── fetch-fonts.js         Descarga las tipografías para autoalojarlas
│
└── public/                    Lo que se publica
    ├── index.html             Página principal
    ├── 404.html               Página de error
    ├── css/
    │   ├── fonts.css          Declaraciones @font-face de las tipografías locales
    │   ├── styles.css         Hoja principal (15 secciones comentadas)
    │   ├── error.css          Estilos de la 404
    │   └── noscript.css       Respaldo si el navegador no ejecuta JavaScript
    ├── js/main.js             Menú móvil, revelados, scroll-spy
    ├── fonts/                 Barlow y Barlow Condensed (woff2, subconjunto latin)
    ├── img/                   Imágenes generadas (no editar a mano)
    ├── robots.txt
    ├── sitemap.xml
    └── site.webmanifest
```

---

## Las fotografías

Las cuatro fotos que enviaste eran capturas verticales (≈478 px de ancho). El
script `scripts/process-images.js` las convierte en las piezas que usa el sitio:

| Pieza                | Foto original      | Proporción | Dónde aparece                  |
|----------------------|--------------------|------------|--------------------------------|
| `hero-unidad`        | bus MAN blanco     | 4:3        | Portada, junto al título       |
| `servicio-escolar`   | autobús amarillo   | 3:2        | Tarjeta "Viajes escolares"     |
| `servicio-evento`    | unidad de noche    | 3:2        | Tarjeta "Conciertos y eventos" |
| `servicio-deportivo` | van Crafter        | 3:2        | Tarjeta "Partidos y deportes"  |
| `flota-1 … flota-4`  | las cuatro         | 1:1        | Mosaico de "Unidades"          |
| `og-…`               | bus MAN blanco     | 1200:630   | Vista previa en redes sociales |

Tratamiento aplicado a todas para que se lean como una misma serie:

1. Recorte con punto focal ajustado a cada vehículo (`focusY` en el script).
2. Saturación y brillo por toma.
3. Curva de contraste.
4. Enfoque, que compensa el reescalado de las capturas.
5. Veladura de color en modo *soft-light*: **cálida** en las tomas de día para
   ligarlas a la paleta arena del sitio, **fría** en la nocturna para reforzar
   el azul sin apagar las luces del autobús.

Salida en **WebP** (principal) y **JPG** (respaldo), servidos con `<picture>`.

### Cambiar un encuadre

Edita el bloque `PIECES` en `scripts/process-images.js` y vuelve a generar:

```bash
npm run images
```

- `focusY` mueve el recorte en vertical: `0` = arriba, `0.5` = centro, `1` = abajo.
- `ratio` cambia la proporción del recorte.
- `grade` ajusta saturación, brillo, contraste y veladura.

### Si consigues fotos en mayor resolución

Es la mejora más rentable del sitio. Los originales actuales son capturas de
video de 478 px de ancho, así que las imágenes se ven algo suaves en pantallas
grandes. Basta con reemplazar los archivos de `src/photos/` (mismos nombres) y
correr `npm run images`: el script generará automáticamente las versiones @2x
cuando haya píxeles suficientes.

---

## Datos de contacto y dominio

Los valores actuales son **provisionales**. Están marcados en el HTML con el
comentario `DATOS DE CONTACTO`.

| Dato | Dónde | Valor actual (provisional) |
|---|---|---|
| Teléfono | `public/index.html` — barra superior, sección contacto, botón de WhatsApp, JSON-LD | `222 000 0000` / `+522220000000` |
| Correo | `public/index.html` — sección contacto, JSON-LD | `contacto@turismosobreruedas.mx` |
| Redes sociales | `public/index.html` — `.social-row` y el bloque `sameAs` del JSON-LD | Instagram y TikTok, ya enlazados |
| Dominio | `public/index.html` (canonical, Open Graph, JSON-LD), `robots.txt`, `sitemap.xml` | `www.turismosobreruedas.mx` |
| Horario | barra superior y tarjeta de contacto | lunes a sábado, 9:00–19:00 |

El teléfono aparece en cuatro lugares porque cada uno tiene un formato distinto
(visible, `tel:`, `wa.me` y datos estructurados). Búscalo como `2220000000`.

Las redes sociales sí están puestas:

- Instagram — <https://www.instagram.com/turismosobreruedas2>
- TikTok — <https://www.tiktok.com/@turismo.sobre.rue8>

Se guardaron en su forma canónica, sin los parámetros `?igsi=` / `?_t=` que
traen los enlaces copiados desde la app: esos son códigos de sesión que
caducan. Los perfiles quedan además declarados en el `sameAs` del JSON-LD,
para que los buscadores asocien el negocio con sus cuentas.

---

## Qué se respetó del mockup y qué se añadió

**Idéntico al mockup:** paleta completa, tipografías (Barlow / Barlow
Condensed), jerarquía tipográfica, orden de las secciones, todos los textos,
iconos y la retícula de 1080 px.

**Añadido, sobre los mismos tokens:**

- Fotografías reales en lugar de los recuadros grises.
- Menú desplegable en móvil (el mockup ocultaba la navegación por debajo de
  820 px sin alternativa).
- Sombras y elevación al pasar el cursor en tarjetas, celdas y botones.
- Entrada escalonada de los bloques al hacer scroll.
- Acceso flotante a WhatsApp que aparece al empezar a leer.
- Subrayado de la sección activa en la navegación.
- Botón "Cotizar una unidad" al final de la sección Unidades.
- Teléfono y correo convertidos en enlaces reales (`tel:`, `mailto:`, `wa.me`).

**Elementos retirados a petición del cliente:** las etiquetas pequeñas
("Renta de autobuses" en la portada, "Servicios" y "Unidades" sobre sus
títulos), el distintivo "Unidad monitoreada por GPS" de la foto de portada,
el botón flotante de WhatsApp y el icono de Facebook. Se conservan las
etiquetas de "Cómo funciona" y "Contáctanos", y los enlaces a Instagram y
TikTok, ya apuntando a los perfiles reales.

**Dos cambios de criterio, por las fotos disponibles:**

1. Las tarjetas de servicio pasaron de 16:9 a **3:2**. En 16:9 la van quedaba
   cortada por el techo y el parachoques; en 3:2 los tres vehículos caben
   completos.
2. El hueco "Foto real · Interior de la unidad" de la sección Unidades se
   resolvió con un **mosaico de las cuatro unidades**, porque no hay ninguna
   foto de interior. Si consigues una, se puede volver al diseño original.

---

## Secciones a pantalla completa

Cada sección ocupa una pantalla entera y centra su contenido. El sistema vive
en la sección 08 de `styles.css` y se apoya en tres ideas:

1. **`min-height`, nunca `height`.** Si el contenido supera la pantalla, la
   sección crece en lugar de recortarse. Nada queda cortado jamás.
2. **Unidades `svh`.** El alto de fotos, márgenes y titulares se expresa en
   `svh` (small viewport height), así que el diseño se adapta al alto real de
   cada equipo en vez de a una medida fija. `vh` queda como respaldo para
   navegadores antiguos, y `svh` evita el salto que provocan las barras del
   navegador móvil.
3. **Fórmulas del tipo `clamp(min, Nsvh - K, max)`.** Las secciones con poco
   contenido (los tres pasos, contacto) se expanden en monitores altos y se
   compactan en ventanas bajas, de modo que llenan la pantalla sin llegar a
   desbordarla.

Composición de las pantallas:

| Pantalla | Contenido | Alto |
|---|---|---|
| 1 | Portada + franja de confianza | `100svh − barra superior − encabezado` |
| 2–5 | Servicios · Seguridad · Unidades · Cómo funciona | `100svh − encabezado` |
| 6 | Contacto + pie de página | `100svh − encabezado − pie` |

Verificado sin desbordes en 1280×600, 1366×768, 1440×900 y 1920×1080.

**Excepción, en teléfonos.** Con una sola columna, tres tarjetas apiladas con
foto no caben físicamente en una pantalla de móvil. Ahí las secciones fluyen a
su alto natural (que es el comportamiento correcto y esperado en móvil); la
portada sí ocupa la pantalla completa.

Si más adelante cambia el alto del encabezado o del pie, basta con actualizar
los tokens `--header-h`, `--topbar-h` y `--footer-h`: toda la retícula vertical
se recalcula sola.

---

## Transiciones entre secciones

La página alterna tres fondos (blanco, arena y verde oscuro). Para que los
saltos de color no se noten, cada panel dibuja en su borde superior una banda
de degradado **a caballo sobre la costura**: la mitad cae en la sección de
arriba y la otra mitad en la propia. Como el degradado empieza exactamente en
el color de la sección anterior y termina en el de la suya, la línea divisoria
desaparece.

```css
.panel::before{
  top:calc(var(--blend-h) / -2);        /* medio dentro, medio fuera */
  height:var(--blend-h);
  background:linear-gradient(to bottom,var(--blend-from),var(--blend-to));
}
```

Cada sección declara sus tres variables. Los saltos de claro a oscuro usan una
banda algo más larga (`5svh`) que los de claro a claro (`2,75svh`), porque el
contraste es mayor. Las bandas son cortas a propósito: suavizan la costura sin
teñir la sección.

---

## Animaciones

Ninguna añade elementos: todas trabajan sobre lo que ya existía.

**Al cargar la portada**

- Titular, texto y botones entran escalonados (0,05 s · 0,15 s · 0,25 s).
- La foto principal hace un acercamiento lento (`ken-burns`, 2,4 s).
- Los cuatro sellos de la franja de confianza aparecen uno tras otro.

**Al hacer scroll**

- Cada bloque se revela al entrar en pantalla, con escalonado entre hermanos.
- Las cuatro unidades del mosaico aparecen una a una.
- La lista de características entra línea por línea, desde la izquierda.
- Los números 01 · 02 · 03 entran con un ligero rebote junto a su tarjeta.
- Paralaje suave de la foto de portada, ligado al scroll con
  `animation-timeline: view()`. Es una mejora progresiva: donde el navegador no
  la soporta, simplemente no ocurre.

**Al pasar el cursor**

- Tarjetas y celdas se elevan; sus fotos hacen zoom.
- El icono de los botones gira ligeramente.
- La etiqueta de cada servicio se tiñe del color de acento.
- Los iconos de contacto y las redes sociales se levantan.

Todo queda desactivado con `prefers-reduced-motion: reduce`, y sin JavaScript
el contenido se muestra completo mediante `noscript.css`.

---

## Accesibilidad y rendimiento

- Enlace "Saltar al contenido", textos alternativos en todas las imágenes,
  `aria-expanded` en el menú y foco visible en todos los elementos interactivos.
- `prefers-reduced-motion`: desactiva animaciones y revelados.
- Sin JavaScript la página se ve completa (`noscript.css`).
- Imágenes con `width`/`height` declarados, carga diferida fuera de la portada
  y `fetchpriority="high"` en la foto principal.
- Compresión gzip y caché de un año para imágenes; el HTML nunca se cachea.
- Cabeceras de seguridad con `helmet` y una política de contenido que solo
  permite recursos propios más Google Fonts.

---

## Antes de publicar

Los tres primeros puntos son obligatorios: sin ellos el sitio sale a internet
con datos falsos de un negocio real. El detalle de dónde cambiar cada cosa
está en «Datos de contacto y dominio», más arriba.

- [ ] **Teléfono real** — hoy `222 000 0000`.
- [ ] **Correo real** — hoy `contacto@turismosobreruedas.mx`.
- [ ] **Dominio real** — hoy `www.turismosobreruedas.mx`. Si se usa el
      subdominio gratuito de Netlify, poner `tu-sitio.netlify.app`.
- [ ] Comprobar que los perfiles de Instagram y TikTok siguen activos.
- [ ] `npm audit` sin vulnerabilidades altas.
- [ ] Repasar las fotos: las matrículas de las unidades son legibles. Son
      vehículos propios, así que normalmente no hay problema, pero conviene
      que sea una decisión consciente y no un descuido.

---

## Despliegue en Netlify

El sitio es estático. `netlify.toml` ya trae toda la configuración.

**Desde la interfaz de Netlify:** «Add new site» → «Import an existing
project» → conectar el repositorio de GitHub. Netlify lee `netlify.toml` y no
hay que rellenar nada a mano; los valores que usará son:

| Ajuste | Valor |
|---|---|
| Build command | `npm run build` |
| Publish directory | `public` |
| Node version | 22 (de `.nvmrc` y `netlify.toml`) |

El paso de build regenera las imágenes desde `src/photos/`. Las versiones ya
generadas también están versionadas, así que aunque el build fallara el sitio
se publicaría igualmente con las imágenes correctas.

### Lo más importante que hay que entender del despliegue

**En Netlify no se ejecuta `server.js`.** Netlify sirve archivos estáticos, así
que todas las cabeceras de seguridad que en local aplica `helmet` desaparecen
en producción salvo que se declaren en `netlify.toml`. Están declaradas allí.

Si algún día se cambia una cabecera, hay que cambiarla **en los dos sitios**:

- `server.js` → para desarrollo local
- `netlify.toml` → para producción

Ambos aplican hoy la misma política.

### Verificar el despliegue

Una vez publicado, comprobar que las cabeceras llegaron:

```bash
curl -sI https://TU-DOMINIO/ | grep -iE "content-security|strict-transport|x-frame|referrer"
```

Deben aparecer las cuatro. Para un informe completo:
<https://securityheaders.com>.

---

## Seguridad

Decisiones tomadas y su motivo:

**Content-Security-Policy cerrada a `'self'`.** El sitio no carga nada de
terceros: ni scripts, ni estilos, ni tipografías, ni imágenes. Eso permite la
política más restrictiva posible — cualquier intento de inyectar un recurso
externo lo bloquea el navegador. No hay `'unsafe-inline'` en ninguna
directiva: no existe un solo `<style>` ni `<script>` en línea en el HTML.

**Tipografías autoalojadas.** Antes se cargaban desde Google Fonts. Al
traerlas al propio dominio se elimina una petición a un tercero por visita, el
sitio deja de depender de un servicio externo, la IP de cada visitante ya no
viaja a Google, y la CSP puede cerrarse. Se descargan con `npm run fonts`, y
solo se incluye el subconjunto `latin` y los pesos que el CSS usa de verdad
(131 kB en total).

**Otras cabeceras:** HSTS con `preload`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY` más `frame-ancestors 'none'` (anti clickjacking),
`Referrer-Policy: strict-origin-when-cross-origin`, y `Permissions-Policy`
denegando cámara, micrófono, geolocalización y pagos, que el sitio no usa.

**Enlaces externos** con `rel="noopener noreferrer"` y `target="_blank"`.

**Sin secretos en el repositorio.** No hay claves, tokens ni credenciales: el
sitio no habla con ninguna API. `.env` está en `.gitignore` y se documenta con
`.env.example`.

**Superficie de ataque mínima.** Es HTML, CSS y unas 140 líneas de JavaScript
sin dependencias en el navegador. No hay formularios, ni base de datos, ni
sesiones, ni backend en producción: no hay nada que inyectar ni que autenticar.

---

## Publicar en otro proveedor

El contenido de `public/` es estático: sirve tal cual en Vercel, Cloudflare
Pages o cualquier hosting. **Si se cambia de proveedor hay que replicar las
cabeceras de `netlify.toml`**, o el sitio quedará sin ellas.

Para mantener el servidor Node (Render, Railway, un VPS):

```bash
NODE_ENV=production npm start
```

Hay una sonda de salud en `/healthz`.
