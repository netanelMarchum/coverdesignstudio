/* ==========================================================================
   Velocity carousel — the cover row in "חדש באוויר".
   --------------------------------------------------------------------------
   A horizontal marquee: the covers travel left, leave at the left edge and
   come back in from the right, forever, with the same gap between every pair.

   THE SHAPE OF IT
   The track holds TWO identical halves. One tween moves it from 0 to -50% of
   its own width with ease:"none" and repeat:-1. At -50% the second half sits
   exactly where the first half started, so the restart is invisible and the
   loop is seamless. That is the whole mechanism — no per-frame bookkeeping, no
   wrap function, no accumulator to drift.

   WHY -50% NEEDS THE GAP GONE — the bug that made this look broken
   The obvious way to space a flex row is `gap`, and with `gap` the -50% recipe
   is WRONG. A row of 2n items is 2n*item + (2n-1)*gap wide, because a gap
   falls BETWEEN items and there is no trailing one. Half of that is
   n*item + (n-1)*gap + gap/2 — but the distance from one item to the same item
   in the next half is n*(item+gap). The two differ by half a gap, so every lap
   slipped by 12px and the seam walked across the row until it read as a hole.

   So the spacing is margin-inline-end on every card instead, trailing one
   included. Each card's box is then item+margin, the track is exactly
   2n*(item+margin), and -50% is exactly n*(item+margin) — the true period, to
   the pixel, with no arithmetic anywhere to get wrong.

   HOW MANY COPIES
   Two halves are only enough if ONE half already covers the viewport. Eight
   cards do that on a laptop and do not on a wide monitor, which is the other
   way this used to run out of images. The originals are repeated until one
   half is at least a viewport wide, and only then is the half duplicated.

   THE ROW IS NOT PART OF THE REVEAL SYSTEM
   .insta-grid ships with `reveal reveal-stagger`, which start the row and every
   card at opacity:0 translated down. In a ticker that is an eight-card hole
   travelling across the screen, and the downward shift was being clipped by
   the wrapper's overflow:hidden — the "covers cut off at the bottom". The
   classes come off here, before anything is measured. They stay in the markup
   so that if this script never runs the row is a plain grid that still needs
   its entrance.

   PROGRESSIVE ENHANCEMENT
   Touch and reduced-motion get a real swipeable row instead: same content, no
   clones, no animation to fight a finger that is already dragging it.
   ========================================================================== */
(function () {
  'use strict';

  var grid = document.querySelector('.insta-grid');
  if (!grid || !window.gsap) return;

  var gsap = window.gsap;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // See "THE ROW IS NOT PART OF THE REVEAL SYSTEM" above. Before anything else.
  grid.classList.remove('reveal', 'reveal-stagger', 'in');

  /* The row gets its OWN wrapper. Reaching for grid.parentNode grabbed the
     section's .container — so the full-bleed margin, the overflow clip and the
     edge mask were applied to the heading and the button as well as to the
     covers, which is what pushed the section off to one side. */
  var viewport = document.createElement('div');
  viewport.className = 'vel-viewport';
  grid.parentNode.insertBefore(viewport, grid);
  viewport.appendChild(grid);

  if (reduce || !fine) {
    grid.classList.add('is-swipe');
    return;
  }
  grid.classList.add('is-carousel');

  var SPEED = 46;        // px per second — a drift, not a slide
  var tween = null;

  function clones() {
    return Array.prototype.slice.call(grid.querySelectorAll('[data-vel-clone]'));
  }

  /** Inert copies: not announced, not tabbable, not counted as real cards. */
  function copy(nodes) {
    nodes.forEach(function (node) {
      var k = node.cloneNode(true);
      k.setAttribute('data-vel-clone', '');
      k.setAttribute('aria-hidden', 'true');
      k.setAttribute('tabindex', '-1');
      grid.appendChild(k);
    });
  }

  function build() {
    var progress = tween ? tween.progress() : 0;
    if (tween) { tween.kill(); tween = null; }
    clones().forEach(function (n) { n.remove(); });

    var originals = Array.prototype.slice.call(grid.children);
    /* The feed script empties this row before it appends the live cards. Park
       the track rather than animating nothing, or it sits translated off to
       the left holding an empty box. */
    if (!originals.length) { gsap.set(grid, { xPercent: 0 }); return; }

    // Measured untransformed: getBoundingClientRect reports the rendered box,
    // and a translated track measures from wherever it currently sits.
    gsap.set(grid, { xPercent: 0 });
    var one = grid.getBoundingClientRect().width;
    var viewW = viewport.getBoundingClientRect().width || innerWidth;
    if (one <= 0) return;

    // Repeat the originals until ONE half covers the viewport, then duplicate
    // that half. Two halves of a too-narrow set is the classic empty marquee.
    /* floor+1, not ceil. With ceil, a viewport that is an exact multiple of one
       set makes the half EXACTLY the viewport width — zero slack — and the
       content then ends precisely on the right edge at the end of the lap. Card
       widths come from 26vw and are routinely fractional, so "precisely" is one
       rounding error away from a hairline of empty ground. floor+1 guarantees
       the half is strictly wider than the viewport, and costs at most one extra
       set of already-decoded images. */
    var repeats = Math.floor(viewW / one) + 1;
    for (var r = 1; r < repeats; r++) copy(originals);

    var half = Array.prototype.slice.call(grid.children);
    copy(half);                       // <- the duplicate that -50% relies on

    /* Duration from width, so the covers travel at one speed whatever the
       screen is doing. A fixed duration would make a wide monitor a slideshow
       and a laptop a blur. */
    var halfW = one * repeats;
    tween = gsap.to(grid, {
      xPercent: -50,
      ease: 'none',
      duration: halfW / SPEED,
      repeat: -1,
    });
    tween.progress(progress);         // resize should not restart the lap
  }

  build();

  /* Card width is set by flex-basis, not by the image, so the track does not
     change width when artwork lands — but fonts and a resize both do. */
  var remeasure = gsap.utils.debounce ? gsap.utils.debounce(build, 150) : build;
  addEventListener('resize', remeasure, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  /* The feed script replaces and appends cards ("הצג עוד"), so the loop is
     rebuilt when the row's real contents change. Synchronously: a
     MutationObserver callback runs before the next paint, so no frame is drawn
     with new content against the old geometry. build() only ever adds clones
     and the filter ignores those, so it cannot recurse. */
  if (window.MutationObserver) {
    var rebuilding = false;
    new MutationObserver(function (records) {
      if (rebuilding) return;
      var real = records.some(function (r) {
        return Array.prototype.some.call(r.addedNodes, function (n) {
          return n.nodeType === 1 && !n.hasAttribute('data-vel-clone');
        });
      });
      if (!real) return;
      rebuilding = true;
      build();
      rebuilding = false;
    }).observe(grid, { childList: true });
  }

  /* A moving row of links is hard to click, so it eases to a stop while the
     pointer is inside it or a card has keyboard focus. timeScale rather than
     pause(): a marquee that halts on the exact frame the pointer crossed the
     edge reads as a bug. */
  function ease(to) {
    if (tween) gsap.to(tween, { timeScale: to, duration: 0.4, ease: 'power2.out' });
  }
  viewport.addEventListener('pointerenter', function () { ease(0); });
  viewport.addEventListener('pointerleave', function () { ease(1); });
  viewport.addEventListener('focusin', function () { ease(0); });
  viewport.addEventListener('focusout', function () { ease(1); });

  /* Scroll velocity nudges the SPEED and nothing else. It cannot open a gap,
     because it never touches geometry — only how fast the same loop runs. */
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: viewport,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: function (self) {
        if (!tween || tween.timeScale() === 0) return;
        var boost = gsap.utils.clamp(1, 3.2, 1 + Math.abs(self.getVelocity()) / 900);
        gsap.to(tween, { timeScale: boost, duration: 0.3, overwrite: true });
        gsap.to(tween, { timeScale: 1, duration: 1.1, delay: 0.3, overwrite: false });
      },
    });
  }
})();
