# Turismo sobre Ruedas — sitio web

Sitio de una página para la renta de autobuses de turismo, con dirección
visual oscura y editorial, y un hero donde el autobús gira a medida que se
hace scroll.

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
| `npm run build` | Regenera fotos y frames del autobús |
| `npm run images` | Solo las fotos, desde `src/photos/` |
| `npm run frames` | Solo los 36 frames, desde `src/bus-frames/` |
| `npm run fonts` | Vuelve a descargar las tipografías (solo si se cambian) |
| `npm audit` | Revisa vulnerabilidades en las dependencias |

Las imágenes, los frames y las tipografías ya están generados y versionados:
tras `npm install`, `npm start` funciona sin ningún paso previo.

Para revisar los frames del autobús de un vistazo:

```bash
npm run frames -- --diagnostico
```

Deja una tira de contactos con los 36 en `src/diagnostico/frames.png`.

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
├── src/bus-frames/            36 renders del autobús, sin tocar
│
├── scripts/
│   ├── process-images.js      Recorta, trata y exporta las fotos del sitio
│   ├── process-bus-frames.js  Recorta y repinta los frames del autobús
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
    ├── js/main.js             Bucle de animación, hero, menú, revelados
    ├── fonts/                 Bricolage Grotesque y Archivo (woff2, latin)
    ├── img/                   Fotos generadas (no editar a mano)
    ├── turn/                  g01…g36.png, los frames del giro (generados)
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

## Dirección visual

Oscura y editorial. El fondo alterna verde profundo `#0A241D` y negro verdoso
`#07100D`; el naranja `#E8622A` y el ámbar `#F0A03C` son **solo acento**:
eyebrows, numeración, botones de WhatsApp y los faros del autobús. Nunca hay
superficies naranjas grandes.

Tipografías: **Bricolage Grotesque** 700/800 para titulares y **Archivo**
400/500/600 para texto, ambas autoalojadas.

### El fondo animado

Las secciones oscuras llevan una malla de cinco manchas radiales que se
recalculan en el mismo `requestAnimationFrame` del hero, más una capa de grano
en `mix-blend-mode: overlay` que rompe el bandeado del degradado.

Cada mancha lleva una fase propia y su desplazamiento está definido de forma
que vale exactamente cero en el instante inicial: por eso no hay salto visible
cuando arranca el bucle.

**Sobre los alfas de la malla.** El boceto original proponía el naranja a `.60`
y el ámbar a `.30`. Montado sobre las seis secciones eso convertía el sitio en
una mancha naranja y contradecía la propia regla de "naranja solo como acento".
Están bajados a `.12` y `.07`. Se ajustan en el bloque `BLOBS` de `main.js`.

### Elementos retirados a petición del cliente

Las etiquetas pequeñas de portada, el distintivo "Unidad monitoreada por GPS",
el botón flotante de WhatsApp y el icono de Facebook. Se conservan Instagram y
TikTok, apuntando a los perfiles reales.

---

## El hero: el autobús que gira

Es la pieza central del sitio y la más delicada.

**Estructura.** Un contenedor de `340vh` con un hijo `position:sticky` de una
pantalla de alto. Mientras se recorren esos 340vh el hijo permanece fijo y todo
lo que ocurre dentro está gobernado por el progreso del scroll.

**Cómo se mide el progreso.** No hay ningún listener de `scroll`. El progreso
se calcula con `getBoundingClientRect()` del contenedor dentro del mismo
`requestAnimationFrame` que anima la malla de fondo. Un solo bucle para todo:
así el giro no puede desincronizarse del fondo, y funciona igual aunque el
scroll lo haga un contenedor y no la ventana.

De ese progreso salen tres fases:

| Fase | Rango | Qué pasa |
|---|---|---|
| Entrada | 0 → 0,09 | El copy se desvanece y sube; el autobús entra desde abajo |
| Giro | 0,06 → 0,78 | 36 frames encadenados y cuatro mensajes que se relevan |
| Salida | 0,80 → 1 | El autobús sale por la derecha y descubre el panel de cifras |

**El giro** cambia únicamente la `opacity` del frame que toca (0 y 1). No se
crea ni se destruye nada en el DOM: 36 imágenes apiladas y un intercambio por
fotograma.

**El panel de revelado** se descubre con `clip-path: inset()` siguiendo al
autobús, de modo que parece que el vehículo arrastra el fondo al salir.

**Con `prefers-reduced-motion: reduce`** no hay giro ni bucle: el hero deja de
ocupar 340vh, el autobús se queda quieto en un frame y el copy permanece
completo en pantalla. Lo mismo sin JavaScript, vía `noscript.css`.

---

## Los frames del autobús

Los 36 renders originales (1200×1200, fondo blanco) están en `src/bus-frames/`.
`scripts/process-bus-frames.js` los convierte en los PNG con transparencia de
`public/turn/`.

Recortarlos tiene dos trampas que se midieron sobre los propios archivos:

1. **Las caras iluminadas de la carrocería son 255,255,255 exacto**, igual que
   el fondo. Un relleno por inundación que solo mire el color se cuela por ahí
   y muerde el techo. Se resuelve con una **barrera de contorno**: se dilatan
   2 px todos los píxeles que no son blanco puro, y el relleno no puede
   atravesarla.

2. **La carrocería y la sombra comparten el mismo rango de gris** (205–250).
   Se comprobó pintando una máscara sobre el render: el mismo criterio de color
   marca a la vez el techo, el costado y la sombra del suelo. Por color no hay
   forma de separarlas. Se separan **por geometría**: para cada columna de
   píxeles se busca el elemento oscuro más bajo del vehículo (faldón, llanta,
   parachoques) y todo el gris que quede por debajo es suelo.

Después se repinta cada píxel con la paleta: naranja en los faros, una rampa de
verdes para la carrocería y casi negro en cristales y llantas. La sombra **no**
se reconstruye en el bitmap: va en CSS, negra y difuminada, para que pueda
escalarse y desvanecerse siguiendo al autobús durante la animación.

### Ajustar el recorte

Los parámetros están en el bloque `AJUSTES` del script:

- `margenBase` — sube el corte si la sombra muerde el parachoques.
- `barrera` — engrosa el sellado del contorno si aparecen mordiscos.
- `sombraMin` — qué se considera suelo por debajo de la base.

La paleta del vehículo vive en el bloque `PALETA`, justo debajo.

---

## Accesibilidad y rendimiento

- Enlace "Saltar al contenido", `aria-expanded` en el menú y foco visible en
  todos los elementos interactivos. Áreas táctiles de 44 px o más.
- De los 36 frames del giro, solo el primero lleva texto alternativo: los otros
  35 son la misma unidad rotando y repetirlo sería ruido para un lector de
  pantalla.
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
