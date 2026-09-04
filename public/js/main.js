/* ==================================================================
   TURISMO SOBRE RUEDAS — Comportamiento de la interfaz
   ------------------------------------------------------------------
   Todo es progresivo: sin JavaScript la página sigue siendo legible y
   navegable, y con `prefers-reduced-motion` no se anima nada.

   Un único requestAnimationFrame gobierna la malla de degradados y la
   animación del hero. No hay listeners de scroll ni de resize como
   fuente de verdad: el progreso se calcula con getBoundingClientRect(),
   así que funciona igual aunque el scroll lo haga un contenedor.

     1. Menú móvil
     2. Cabecera y sección activa
     3. Revelado de bloques al entrar en pantalla
     4. Malla de degradados animada
     5. Hero: giro del autobús con el scroll
     6. Bucle único
     7. Año del pie
   ================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------- 1. Menú móvil --------------------------------------- */
  var boton = document.querySelector('.nav-boton');
  var navMovil = document.getElementById('nav-movil');

  function cerrarMenu() {
    if (!boton || !navMovil) return;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
    navMovil.hidden = true;
  }

  if (boton && navMovil) {
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      if (abierto) {
        cerrarMenu();
      } else {
        boton.setAttribute('aria-expanded', 'true');
        boton.setAttribute('aria-label', 'Cerrar menú');
        navMovil.hidden = false;
      }
    });

    navMovil.addEventListener('click', function (e) {
      if (e.target.closest('a')) cerrarMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) cerrarMenu();
    });
  }

  /* ---------- 2. Cabecera y sección activa ------------------------ */
  var cabecera = document.querySelector('.cabecera');
  var barraProgreso = document.querySelector('[data-progreso]');

  var enlacesNav = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secciones = enlacesNav
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && secciones.length) {
    var espia = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          enlacesNav.forEach(function (a) {
            a.classList.toggle('activo', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    secciones.forEach(function (s) { espia.observe(s); });
  }

  /* ---------- 3. Revelado de bloques ------------------------------ */
  var revelables = Array.prototype.slice.call(document.querySelectorAll('[data-revelar]'));

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revelables.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var revelador = new IntersectionObserver(
      function (entradas, obs) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );
    revelables.forEach(function (el) {
      // Lo que ya está en pantalla al cargar entra de inmediato.
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
      else revelador.observe(el);
    });
  }

  /* ---------- 4. Malla de degradados ------------------------------ */
  /*
     Cinco manchas radiales compuestas en un solo background-image. Cada
     una lleva una fase propia; el desplazamiento se define de forma que
     vale exactamente 0 en el instante inicial, así no hay salto visible
     al arrancar el bucle.
  */
  // El naranja y el ámbar van con alfas bajas a propósito: son acento,
  // no fondo. Con los valores altos del boceto original el hero se
  // volvía una mancha naranja y rompía la dirección oscura del diseño.
  var BLOBS = [
    { c: [232, 98, 42], x: 66.9, y: 46.4, r: 58, a: 0.12, p: 0.0, p2: 1.7 },
    { c: [18, 70, 58], x: 34.7, y: 66.3, r: 54, a: 0.95, p: 1.1, p2: 3.4 },
    { c: [240, 160, 60], x: 48.9, y: 19.3, r: 42, a: 0.07, p: 2.3, p2: 0.6 },
    { c: [7, 27, 22], x: 80.2, y: 87.5, r: 46, a: 0.92, p: 3.9, p2: 2.2 },
    { c: [143, 167, 155], x: 8, y: 88, r: 34, a: 0.1, p: 5.0, p2: 4.1 },
  ];

  var capasMalla = Array.prototype.slice.call(document.querySelectorAll('[data-malla]'));

  function pintarMalla(ph) {
    if (!capasMalla.length) return;
    var capas = [];

    for (var i = 0; i < BLOBS.length; i++) {
      var b = BLOBS[i];
      var x = b.x + (Math.sin(ph * 0.55 + b.p) - Math.sin(b.p)) * 5.6;
      var y = b.y + (Math.sin(ph * 0.43 + b.p2) - Math.sin(b.p2)) * 5.6;
      var col = b.c[0] + ',' + b.c[1] + ',' + b.c[2];

      capas.push(
        'radial-gradient(circle at ' + x + '% ' + y + '%,' +
          'rgba(' + col + ',' + b.a + ') 0%,' +
          'rgba(' + col + ',' + b.a * 0.844 + ') ' + b.r * 0.25 + '%,' +
          'rgba(' + col + ',' + b.a * 0.5 + ') ' + b.r * 0.5 + '%,' +
          'rgba(' + col + ',' + b.a * 0.156 + ') ' + b.r * 0.75 + '%,' +
          'rgba(' + col + ',0) ' + b.r + '%)'
      );
    }

    var valor = capas.join(',');
    for (var j = 0; j < capasMalla.length; j++) capasMalla[j].style.backgroundImage = valor;
  }

  /* ---------- 5. Hero: el autobús gira con el scroll -------------- */
  var hero = document.querySelector('[data-hero]');
  var heroCopy = document.querySelector('[data-hero-copy]');
  var contenedorFrames = document.querySelector('[data-frames]');
  var autobus = document.querySelector('[data-autobus]');
  var sombra = document.querySelector('.autobus-sombra');
  var revelado = document.querySelector('[data-revelado]');
  var mensajes = Array.prototype.slice.call(document.querySelectorAll('[data-mensaje]'));

  // El número de frames lo declara el HTML: así, si algún día se exporta
  // el giro con más renders, solo cambian data-total y los archivos.
  var TOTAL_FRAMES = contenedorFrames ? Number(contenedorFrames.dataset.total) || 36 : 36;

  var frames = [];
  var frameActual = -1;
  var mensajeActual = -1;

  if (contenedorFrames) {
    for (var n = 1; n <= TOTAL_FRAMES; n++) {
      var img = document.createElement('img');
      img.src = '/turn/g' + String(n).padStart(2, '0') + '.png';
      img.loading = 'eager';
      img.decoding = 'async';
      img.width = 520;
      img.height = 520;
      // Solo el primero lleva texto alternativo: los 35 restantes son
      // la misma unidad girando y repetirlo sería ruido para el lector.
      img.alt = n === 1 ? 'Autobús de turismo de Turismo sobre Ruedas' : '';
      frames.push(img);
      contenedorFrames.appendChild(img);
    }
    if (frames.length) {
      frames[0].style.opacity = '1';
      frameActual = 0;
    }
  }

  /*
     Cambio seco de fotograma: solo cambia la opacidad del frame que
     toca. Se probó fundir cada frame con el siguiente para suavizar el
     giro y el resultado fue peor: a 10° por paso los dos fotogramas
     quedan lo bastante separados como para verse dos autobuses a la
     vez. La fluidez real solo llega con más renders, no con mezclas.
  */
  function mostrarFrame(idx) {
    if (idx === frameActual || !frames.length) return;
    if (frameActual >= 0) frames[frameActual].style.opacity = '0';
    frames[idx].style.opacity = '1';
    frameActual = idx;
  }

  function mostrarMensaje(idx) {
    if (idx === mensajeActual) return;
    if (mensajeActual >= 0 && mensajes[mensajeActual]) mensajes[mensajeActual].classList.remove('visible');
    if (idx >= 0 && mensajes[idx]) mensajes[idx].classList.add('visible');
    mensajeActual = idx;
  }

  function animarHero() {
    if (!hero) return;

    var rect = hero.getBoundingClientRect();
    var span = Math.max(1, hero.offsetHeight - window.innerHeight);
    var raw = clamp01(-rect.top / span);
    var spin = clamp01((raw - 0.06) / 0.72);
    var exit = clamp01((raw - 0.8) / 0.2);

    // Copy: se apaga en cuanto empieza el scroll.
    if (heroCopy) {
      var op = clamp01(1 - raw / 0.09);
      heroCopy.style.opacity = op;
      heroCopy.style.transform = 'translateY(' + -raw * 90 + 'px)';
      heroCopy.style.pointerEvents = op < 0.05 ? 'none' : '';
    }

    // Autobús: sube desde fuera de cuadro, gira y sale por la derecha.
    if (autobus) {
      var rise = clamp01(raw / 0.1);
      var subida = -rise * 26; // vh
      var salidaX = exit * 90; // vw
      var escala = 1 - spin * 0.06 + exit * 0.04;
      autobus.style.transform =
        'translateX(calc(-50% + ' + salidaX + 'vw)) translateY(' + subida + 'vh) scale(' + escala + ')';
      autobus.style.opacity = exit > 0.55 ? clamp01(1 - (exit - 0.55) / 0.45) : 1;
    }
    if (sombra) {
      // La sombra se abre y se difumina conforme el autobús se aleja.
      sombra.style.transform = 'translateX(-50%) scale(' + (1 + exit * 0.35) + ')';
      sombra.style.opacity = clamp01(1 - exit * 1.2);
    }

    mostrarFrame(Math.floor(spin * TOTAL_FRAMES) % TOTAL_FRAMES);
    mostrarMensaje(spin <= 0.02 || exit > 0.25 ? -1 : Math.min(3, Math.floor(spin * 4)));

    if (revelado) {
      var wipe = Math.min(100, Math.max(0, exit * 118 - 6));
      revelado.style.clipPath = 'inset(0 ' + (100 - wipe) + '% 0 0)';
    }
  }

  /* ---------- 6. Bucle único -------------------------------------- */
  function progresoPagina() {
    if (!barraProgreso) return;
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    var p = alto > 0 ? clamp01(window.scrollY / alto) : 0;
    barraProgreso.style.width = p * 100 + '%';
  }

  function marcarCabecera() {
    if (cabecera) cabecera.classList.toggle('fija', window.scrollY > 8);
  }

  var inicio = null;
  function bucle(t) {
    if (inicio === null) inicio = t;
    pintarMalla((t - inicio) / 1000);
    animarHero();
    progresoPagina();
    marcarCabecera();
    window.requestAnimationFrame(bucle);
  }

  if (reduceMotion) {
    // Un solo fotograma estático: ni malla en movimiento ni giro.
    pintarMalla(0);
    progresoPagina();
    marcarCabecera();
  } else {
    window.requestAnimationFrame(bucle);
  }

  /* ---------- 7. Año del pie -------------------------------------- */
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
