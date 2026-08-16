/* ==========================================================================
   Motion layer — smooth scroll, parallax, magnetic CTA.
   --------------------------------------------------------------------------
   Additive on purpose. The site's own reveal system (IntersectionObserver +
   the .reveal / .reveal-stagger classes) stays exactly as it is and keeps
   working with this file absent, blocked or failed. Nothing here is required
   for anything to be readable.

   Everything is gated three ways:
     · prefers-reduced-motion  — the whole file no-ops
     · a coarse pointer        — no magnetic hover on touch, where there is no cursor
     · the library being there — Lenis and GSAP are CDN scripts and may not load
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  /* ---- smooth scroll ----------------------------------------------------
     Lenis, not scroll hijacking: it smooths the wheel-to-scroll response and
     leaves the scrollbar, keyboard, anchor jumps and native scrolling intact.
     lerp is deliberately high — the brief asks for smooth, and a low value
     produces the floaty lag that makes a page feel unresponsive. */
  var lenis = null;
  if (window.Lenis && !window.__cdsLenis) {
    lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
    // Published so the pinned cover experience uses THIS instance rather than
    // creating a second one. Two Lenis instances driving the same scroll is the
    // classic way a pinned section starts fighting itself.
    window.__cdsLenis = lenis;

    // ScrollTrigger drives the pinned cover experience and has to be told
    // where the page actually is, or the pin drifts against the smoothed scroll.
    if (window.ScrollTrigger) {
      // A phone hides and shows its address bar on scroll, which fires resize and
      // makes ScrollTrigger recalculate a pin mid-gesture — the section jumps.
      window.ScrollTrigger.config({ ignoreMobileResize: true });
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }

    // The scroll cue and any in-page anchor go through Lenis so the jump is
    // smoothed rather than fighting it.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -90 });
    });
  }

  if (!window.gsap) return;
  var gsap = window.gsap;

  /* ---- the orbiting covers drift ---------------------------------------
     A small parallax on the hero tiles, scrubbed to scroll. Different depths
     per tile so the field has dimension rather than moving as one plane.
     transform only — nothing here touches layout. */
  /* The hero parallax, through gsap.matchMedia().
     It used to run one set of pixel amounts at every width: 18-62px of tile
     travel and 60px of ribbon on a 1440 monitor is depth, and the identical
     amount on a 390px phone is six covers sliding around inside a band barely
     taller than they are. matchMedia also reverts everything it built when a
     query stops matching, so dragging a window across a breakpoint cannot
     leave a second set of ScrollTriggers behind the first. */
  if (window.ScrollTrigger) {
    var heroMM = gsap.matchMedia();
    heroMM.add({
      desktop: '(min-width: 1025px)',
      tablet: '(min-width: 721px) and (max-width: 1024px)',
      mobile: '(max-width: 720px)',
    }, function (ctx) {
      var k = ctx.conditions.desktop ? 1 : ctx.conditions.tablet ? 0.62 : 0.3;

      document.querySelectorAll('.orbit-tile').forEach(function (tile, i) {
        // Three depths, so the field has dimension rather than moving as one plane.
        gsap.to(tile, {
          y: (18 + (i % 3) * 22) * k,
          ease: 'none',
          scrollTrigger: { trigger: '.intro', start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
      });

      // The ribbon drifts slower than the tiles, which is what puts it behind them.
      var ribbon = document.querySelector('.hero-ribbon');
      if (ribbon) {
        gsap.to(ribbon, {
          y: 60 * k, ease: 'none',
          scrollTrigger: { trigger: '.intro', start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
      }
    });
  }

  /* ---- work summary: the choreographed entrance ------------------------
     The five beats the section is built around, driven by one ScrollTrigger so
     they cannot drift apart: the block establishes, the video wipes open, the
     type enters, the index follows, the CTA resolves last.

     The wipe is clip-path — it reveals the frame the video already occupies
     rather than moving or scaling it, so nothing reflows and the poster is
     never seen sliding. transform and clip-path only. */
  var ws = document.querySelector('.worksum');
  if (ws && window.ScrollTrigger) {
    var media = ws.querySelector('.worksum-media');
    var beats = [
      ws.querySelector('.eyebrow'),
      ws.querySelector('.section-title'),
      ws.querySelector('.worksum-lead'),
      ws.querySelector('.worksum-index'),
      ws.querySelector('.worksum-cta'),
    ].filter(Boolean);

    var intro = gsap.timeline({
      scrollTrigger: { trigger: ws, start: 'top 78%', once: true },
      defaults: { ease: 'expo.out' },
    });

    if (media) {
      intro.fromTo(media,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 }, 0);
    }
    intro.from(beats, { y: 18, opacity: 0, duration: .7, stagger: .09 }, 0.25);
  }

  /* ---- magnetic CTA -----------------------------------------------------
     Only on a fine pointer, and only on the primary buttons. The pull is small
     — 6px — because a button that runs away from the cursor is a gimmick, and
     one that leans very slightly toward it reads as responsive. */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      var bounds;
      function move(e) {
        if (!bounds) bounds = btn.getBoundingClientRect();
        var mx = e.clientX - (bounds.left + bounds.width / 2);
        var my = e.clientY - (bounds.top + bounds.height / 2);
        gsap.to(btn, {
          x: mx * 0.18, y: my * 0.22,
          duration: 0.4, ease: 'power3.out',
        });
      }
      btn.addEventListener('pointerenter', function () { bounds = btn.getBoundingClientRect(); });
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', function () {
        bounds = null;
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
})();
