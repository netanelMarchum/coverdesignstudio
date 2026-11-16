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

  // Keep native wheel, touch, keyboard and history scrolling.

  if (!window.gsap) return;
  var gsap = window.gsap;
  if (window.ScrollTrigger) window.ScrollTrigger.config({ ignoreMobileResize: true });

  // Background decoration uses independent CSS floating, not scroll parallax.

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
