/* ==========================================================================
   Cursor trail — a grid-snapped path of lime blocks behind the pointer.
   --------------------------------------------------------------------------
   Blocks land on a hidden grid, so the path reads as a sequence of discrete
   cells with hard corners rather than a smeared line. Each block fades over
   about a second and is gone; what is left on screen is only ever the last
   moment of movement.

   ONE CANVAS, NOT MANY ELEMENTS
   A trail of DOM nodes means dozens of inserts, style recalcs and removals per
   second, and every one of them is on the same main thread as the scroll
   smoothing and the pinned cover section. A single canvas draws the whole trail
   in one pass, and the loop stops entirely the moment the last block dies —
   an idle pointer costs nothing at all.

   RESTRAINT
   The lime is the site's accent, and the design system spends it about four
   times on a page. A trail is transient rather than standing, so it does not
   break that rule — but it is deliberately small-celled, quick to die and
   never fully opaque, because a bright green snake following the pointer
   across a studio's portfolio would be competing with the work.
   ========================================================================== */
(function () {
  'use strict';

  // Decoration with no informational role: anyone who has asked for less
  // motion loses nothing by not having it, and a touch screen has no cursor.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var CELL = 16;        // grid pitch — the block size, and the snap
  var LIFE = 1100;      // ms from full to gone
  var MAX = 26;         // blocks kept; beyond this the oldest is dropped
  var ALPHA = 0.85;     // the brightest a block ever gets

  var canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d', { alpha: true });
  var dpr = 1;
  var lime = '#D9FF00';

  function readAccent() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    if (v) lime = v;
  }
  readAccent();

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener('resize', size, { passive: true });

  var trail = [];
  var lastCell = -1;
  var running = false;

  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;

    // Snap to the grid. The path is a sequence of cells, so a block is only
    // added when the pointer actually crosses into a new one — that is what
    // gives the trail its even spacing however fast the mouse moves.
    var cx = Math.floor(e.clientX / CELL) * CELL;
    var cy = Math.floor(e.clientY / CELL) * CELL;
    var key = cx * 8192 + cy;
    if (key === lastCell) return;
    lastCell = key;

    trail.push({ x: cx, y: cy, born: performance.now() });
    if (trail.length > MAX) trail.shift();

    if (!running) { running = true; requestAnimationFrame(frame); }
  }, { passive: true });

  function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    var alive = 0;
    for (var i = 0; i < trail.length; i++) {
      var b = trail[i];
      var age = (now - b.born) / LIFE;
      if (age >= 1) continue;
      alive++;

      // Fades out and shrinks toward its own centre, so the tail of the path
      // reads as receding rather than just dimming.
      var t = 1 - age;
      var inset = (1 - t) * (CELL * 0.34);
      ctx.globalAlpha = t * t * ALPHA;
      ctx.fillStyle = lime;
      // Hard-edged: no radius, no blur. The brief's pixel language is the
      // point, and a rounded, glowing block is a different idea entirely.
      ctx.fillRect(b.x + inset, b.y + inset, CELL - inset * 2, CELL - inset * 2);
    }
    ctx.globalAlpha = 1;

    if (alive > 0) {
      requestAnimationFrame(frame);
    } else {
      // Nothing left to draw — clear once and stop. No idle loop.
      trail.length = 0;
      lastCell = -1;
      running = false;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  // The accent is a token and can be changed by the high-contrast mode.
  if (window.MutationObserver) {
    new MutationObserver(readAccent).observe(document.documentElement, {
      attributes: true, attributeFilter: ['class'],
    });
  }
})();
