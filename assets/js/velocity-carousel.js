/* ==========================================================================
   Velocity carousel — the cover row in "חדש באוויר".
   --------------------------------------------------------------------------
   A horizontal marquee that drifts on its own and takes its speed from how
   fast you are scrolling the page: scroll hard and the row accelerates and
   skews slightly, stop and it eases back to a slow base drift. Scrolling up
   reverses it.

   Built on GSAP + the page's existing Lenis rather than imported: the Framer
   module this is modelled on is a React component (it imports React and
   framer-motion), this site ships neither, and the site's CSP only allows
   scripts from itself and cdnjs — a framer.com module would be blocked in
   production before any of that mattered.

   PROGRESSIVE ENHANCEMENT
   The markup is untouched: .insta-grid stays a grid of links in the DOM and is
   still a perfectly good grid with this file absent. The carousel is applied on
   top, and only where it makes sense:
     · fine pointer + motion allowed  → the velocity marquee
     · touch, or reduced motion       → a native swipeable row, no auto-drift
   A row of links that never stops moving is hard to click, so it pauses on
   hover and on keyboard focus.
   ========================================================================== */
(function () {
  'use strict';

  var grid = document.querySelector('.insta-grid');
  if (!grid || !window.gsap) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* The row gets its OWN wrapper. Reaching for grid.parentNode grabbed the
     section's .container — so the full-bleed margin, the overflow clip and the
     edge mask were being applied to the heading and the button as well as to
     the covers, which is what pushed the section off to one side. */
  var viewport = document.createElement('div');
  viewport.className = 'vel-viewport';
  grid.parentNode.insertBefore(viewport, grid);
  viewport.appendChild(grid);

  /* Touch and reduced-motion get a real scrollable row instead. It is the same
     content, swipeable, with no animation to fight. */
  if (reduce || !fine) {
    grid.classList.add('is-swipe');
    return;
  }

  grid.classList.add('is-carousel');

  var gsap = window.gsap;
  var wrapX = null;
  var half = 0;
  var x = 0;
  var boost = 0;      // added by scroll velocity, decays to 0
  var dir = 1;        // 1 = drifting start-ward, -1 = reversed
  var target = 1;     // 1 = running, 0 = held
  var scale = 1;      // eased toward target, so nothing ever stops dead
  var BASE = 0.4;     // px per frame at rest — a drift, not a slide

  /* The loop is made by repeating the row. Clones are inert: aria-hidden and
     removed from the tab order, so the same covers are not announced or tabbed
     through twice.

     TWO THINGS THIS HAS TO GET EXACTLY RIGHT, and the first version got both
     wrong the same way — by guessing the wrap distance instead of measuring it.

     1. HOW FAR TO WRAP. It is one set PLUS the gap separating it from the next
        set. scrollWidth/2 is not that: a track has one fewer gap than cards, so
        half of it lands half a gap short and every wrap jumped backwards by
        that much. At a 24px gap that is a 12px seam, every lap.

     2. HOW MANY COPIES. Two sets are only enough when one set is already wider
        than the viewport. When it is not, the row runs out and you get the
        empty stretch before the next card arrives. Enough copies are made to
        cover twice the viewport, whatever the card count and screen width. */
  function build() {
    Array.prototype.slice.call(grid.querySelectorAll('[data-vel-clone]')).forEach(function (n) {
      n.remove();
    });
    var originals = Array.prototype.slice.call(grid.children);
    if (!originals.length) return;

    // One set, measured with no clones present and therefore no trailing gap.
    var setW = grid.scrollWidth;
    var gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    var step = setW + gap;                     // the exact wrap distance
    if (step <= 0) return;

    var copies = Math.max(1, Math.ceil((innerWidth * 2) / step));
    for (var c = 0; c < copies; c++) {
      originals.forEach(function (node) {
        var k = node.cloneNode(true);
        k.setAttribute('data-vel-clone', '');
        k.setAttribute('aria-hidden', 'true');
        k.setAttribute('tabindex', '-1');
        // the reveal system staggers children; a clone must not wait its turn
        k.style.opacity = '1';
        k.style.transform = 'none';
        grid.appendChild(k);
      });
    }

    half = step;
    wrapX = gsap.utils.wrap(-half, 0);
  }

  function measure() { build(); }

  build();

  /* Images arrive after the markup, and the track width is the sum of their
     widths — measuring before they land gives a wrap point that is wrong. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  Array.prototype.slice.call(grid.querySelectorAll('img')).forEach(function (img) {
    if (img.complete) return;
    img.addEventListener('load', measure, { once: true });
  });
  addEventListener('resize', gsap.utils.debounce ? gsap.utils.debounce(measure, 150) : measure, { passive: true });

  /* The feed script replaces and appends cards ("הצג עוד"), so the loop has to
     be rebuilt when the row's contents change — otherwise the clones are stale
     and the wrap point is measured against the wrong width. */
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
      requestAnimationFrame(function () { build(); rebuilding = false; });
    }).observe(grid, { childList: true });
  }

  /* Scroll velocity. ScrollTrigger reports px/second; it is scaled down hard
     and clamped, because the point is that the row reacts to the gesture, not
     that it launches across the screen. */
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: viewport,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: function (self) {
        var v = self.getVelocity();
        if (v) dir = v > 0 ? 1 : -1;
        boost = gsap.utils.clamp(0, 26, Math.abs(v) / 140);
      },
    });
  }

  /* A moving row of links is hard to click, so the row holds while the pointer
     is in it — but it EASES to a hold rather than stopping on the frame the
     pointer crossed the edge. A marquee that halts instantly reads as a bug,
     and it also snapped the skew flat, which looked like a glitch. */
  viewport.addEventListener('pointerenter', function () { target = 0; });
  viewport.addEventListener('pointerleave', function () { target = 1; });
  viewport.addEventListener('focusin', function () { target = 0; });
  viewport.addEventListener('focusout', function () { target = 1; });

  gsap.ticker.add(function () {
    if (!wrapX) return;
    // The boost always decays toward zero, so the row settles the moment the
    // page stops moving rather than coasting.
    boost *= 0.94;
    if (boost < 0.01) boost = 0;
    scale += (target - scale) * 0.09;
    if (scale < 0.001) scale = 0;

    x -= (BASE + boost) * dir * scale;
    gsap.set(grid, {
      x: wrapX(x),
      /* A whisper of skew in the direction of travel — it reads as speed. Any
         more and the covers look bent, which is the opposite of the point.
         Multiplied by the same scale as the movement, so the shear is always a
         property of how fast the row is ACTUALLY going. That is what stops a
         hovered card from sitting at an angle while the row is standing still,
         and it means the lift on that card is read against a square frame. */
      skewX: gsap.utils.clamp(-4, 4, -boost * 0.16 * dir * scale),
      force3D: true,
    });
  });
})();
