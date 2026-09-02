/* ==================================================================
   TURISMO SOBRE RUEDAS — Comportamiento de la interfaz
   ------------------------------------------------------------------
   Todo lo que hay aquí es progresivo: si el JavaScript no carga, la
   página sigue siendo perfectamente legible y navegable.

     1. Menú móvil
     2. Sombra del encabezado al hacer scroll
     3. Sección activa en la navegación
     4. Revelado de contenido al entrar en pantalla
     5. Año del pie de página
   ================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Menú móvil --------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('nav-movil');

  function closeMenu() {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    mobileNav.classList.remove('is-open');
    mobileNav.hidden = true;
  }

  function openMenu() {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú');
    mobileNav.hidden = false;
    mobileNav.classList.add('is-open');
  }

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) closeMenu();
      else openMenu();
    });

    // Al elegir un destino, el panel se cierra solo.
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    // Si la ventana crece hasta el diseño de escritorio, se recoge.
    window.matchMedia('(min-width: 821px)').addEventListener('change', function (e) {
      if (e.matches) closeMenu();
    });
  }

  /* ---------- 2. Sombra del encabezado al hacer scroll ------------ */
  var header = document.querySelector('header.site');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 8);
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );
  onScroll();

  /* ---------- 3. Sección activa en la navegación ------------------ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav.main a[href^="#"]'));
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ---------- 4. Revelado al entrar en pantalla ------------------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var revealer = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    revealables.forEach(function (el) {
      // Lo que ya está en pantalla al cargar entra de inmediato (escalonado
      // por el transition-delay del CSS); el resto espera al scroll.
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('is-visible');
      } else {
        revealer.observe(el);
      }
    });
  }

  /* ---------- 5. Año del pie de página ---------------------------- */
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
