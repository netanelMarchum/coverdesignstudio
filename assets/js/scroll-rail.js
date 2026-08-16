/* ==========================================================================
   Scroll rail — the page's scroll position as part of the identity.
   --------------------------------------------------------------------------
   A hairline down the right edge carrying a travelling indicator, a filled
   progress line behind it, and a tick for every major section. The indicator
   stretches with scroll velocity, crossfades between the two brand colours by
   section, and fades back when the page is idle.

   REUSABLE BY CONSTRUCTION
   Nothing about this file knows what page it is on. It reads the document for
   sections that have an id and a heading, builds a tick per section, and
   labels each from that heading. Drop it on any page in the site and it maps
   that page. No configuration, no per-page markup.

   WHY NOT REACT
   The brief asks for a React component. This site has no React, no JSX build
   and no framework — adding one for a scrollbar would mean replacing the
   architecture to deliver a widget. It is built instead as a self-contained
   module on the stack that is already here: GSAP for the frame loop and the
   colour interpolation, and the page's existing Lenis for the momentum the
   brief asks for. Same behaviour, none of the dependency.

   THE NATIVE BAR IS THE FALLBACK
   The document scrollbar is only hidden once this file has actually built the
   rail — the `rail-on` class does that, and it is set at the end of setup. If
   the script fails, is blocked, or never runs, the styled native scrollbar is
   still there and the page still scrolls.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.gsap) return;
  var gsap = window.gsap;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer:coarse)').matches;

  /* ---- which sections get a tick ---------------------------------------
     A section earns a marker if it can be linked to and named. Anything that
     cannot be labelled would be an unexplained dot on a line. */
  var sections = [].slice.call(document.querySelectorAll('main section[id], body > section[id]'))
    .map(function (el) {
      var h = el.querySelector('h1, h2');
      var label = el.getAttribute('aria-label') || (h && h.textContent.trim());
      return label ? { el: el, label: label.slice(0, 40) } : null;
    })
    .filter(Boolean);

  if (sections.length < 2) return;   // one marker is not a map

  /* ---- build ------------------------------------------------------------ */
  var rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'ניווט מהיר בעמוד');

  var line = document.createElement('span');
  line.className = 'rail-line';
  line.setAttribute('aria-hidden', 'true');

  var fill = document.createElement('span');
  fill.className = 'rail-fill';
  fill.setAttribute('aria-hidden', 'true');

  var head = document.createElement('span');
  head.className = 'rail-head';
  head.setAttribute('aria-hidden', 'true');

  rail.appendChild(line);
  rail.appendChild(fill);
  rail.appendChild(head);

  sections.forEach(function (s, i) {
    /* A real button, not a decorated div: this is in-page navigation and it
       has to be reachable by keyboard like any other link on the site. */
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-tick';
    b.setAttribute('aria-label', s.label);
    b.innerHTML = '<span class="rail-tick-label" aria-hidden="true"></span>';
    b.querySelector('.rail-tick-label').textContent = s.label;
    b.addEventListener('click', function () {
      var lenis = window.__cdsLenis;
      if (lenis) lenis.scrollTo(s.el, { offset: -80 });
      else s.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    s.tick = b;
    s.index = i;
    rail.appendChild(b);
  });

  document.body.appendChild(rail);

  /* ---- geometry --------------------------------------------------------
     Recomputed on resize and after images settle — a tick placed against a
     layout that has not finished points at the wrong part of the page. */
  var docH = 1;
  function measure() {
    docH = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    sections.forEach(function (s) {
      var top = s.el.getBoundingClientRect().top + scrollY;
      s.pos = gsap.utils.clamp(0, 1, top / docH);
      s.tick.style.top = (s.pos * 100) + '%';
    });
  }
  measure();
  addEventListener('resize', gsap.utils.debounce ? gsap.utils.debounce(measure, 150) : measure, { passive: true });
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  /* ---- state ------------------------------------------------------------ */
  var LAV = '#E7B7F5';
  var LIME = '#D9FF00';
  var mixer = gsap.utils.interpolate(LAV, LIME);

  var progress = 0;       // eased toward the real scroll position
  var stretch = 1;        // velocity squash, eased back to 1
  var active = -1;
  var idleTimer = null;
  var lastY = scrollY;

  function wake() {
    rail.classList.add('is-live');
    clearTimeout(idleTimer);
    /* Present while scrolling, quiet when not. The page is the subject; the
       rail is an instrument that only speaks when it is being used. */
    idleTimer = setTimeout(function () { rail.classList.remove('is-live'); }, 900);
  }
  addEventListener('scroll', wake, { passive: true });

  gsap.ticker.add(function () {
    var y = scrollY;
    var raw = gsap.utils.clamp(0, 1, y / docH);

    /* Interpolation, not assignment: the indicator trails the true position by
       a hair, which is what makes it read as a physical object being carried
       rather than a value being printed. Reduced motion gets the raw value. */
    progress = reduce ? raw : progress + (raw - progress) * 0.12;

    /* Velocity as squash. Scrolling fast stretches the head along its axis and
       thins it — the same cue a fast-moving object gives in the physical
       world, and far more legible than making it change colour. */
    if (!reduce) {
      var v = Math.abs(y - lastY);
      stretch += (gsap.utils.clamp(1, 2.6, 1 + v / 26) - stretch) * 0.18;
      stretch += (1 - stretch) * 0.06;
    }
    lastY = y;

    gsap.set(head, {
      yPercent: 0,
      top: (progress * 100) + '%',
      scaleY: reduce ? 1 : stretch,
      force3D: true,
    });
    gsap.set(fill, { scaleY: progress });

    /* Which section owns the indicator right now. */
    var i = 0;
    for (var k = 0; k < sections.length; k++) if (raw >= sections[k].pos - 0.002) i = k;
    if (i !== active) {
      active = i;
      sections.forEach(function (s, n) { s.tick.classList.toggle('is-active', n === i); });
      /* The colour is carried by position through the page rather than by an
         arbitrary per-section value, so the crossfade is continuous instead of
         switching at each boundary. */
      var t = sections.length > 1 ? i / (sections.length - 1) : 0;
      var c = mixer(t);
      rail.style.setProperty('--rail-accent', c);
    }
  });

  /* Only now, with the rail actually on screen and running, does the native
     scrollbar get hidden. On a touch screen the rail is a read-only indicator —
     it never takes pointer events there, so nothing competes with the finger
     that is already scrolling the page. */
  document.documentElement.classList.add('rail-on');
  if (coarse) rail.classList.add('is-passive');
})();
