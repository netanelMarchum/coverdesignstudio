/* ==========================================================================
   Inline "cover built layer-by-layer" experience.
   Pins #cx and scrubs a GSAP timeline through it: eight full-bleed frames of
   the same cover, each fading in over the one before, so scrolling plays the
   build. No panels, no captions, no chrome — just the images.
   ========================================================================== */
(function () {
  var root = document.getElementById('cx');
  if (!root) return;

  var layers = Array.prototype.slice.call(root.querySelectorAll('.layer'));
  if (!layers.length) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    root.classList.add('cx-static');            // CSS holds the finished cover
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* The pin uses position:fixed, so no ancestor may create a containing block
     (a transform, filter or will-change on a parent silently breaks it and the
     section scrolls away mid-animation). Clear any that crept in. */
  for (var p = root.parentElement; p && p !== document.body; p = p.parentElement) {
    p.style.willChange = 'auto';
    p.style.transform = 'none';
  }

  /* Header/float hiding is driven off isActive rather than an edge event:
     onToggle alone does not re-fire after a ScrollTrigger.refresh() (the
     language switch triggers one), which left the header visible on top of the
     pinned frame. Syncing it idempotently on every hook keeps it honest.

     Only while scrolling DOWN, though. Hiding it in both directions meant that
     once you were inside the pin the site had no header, no floating controls
     and several screens of scrolling in either direction — nothing to leave
     with, which reads as being stuck on the images. Reversing now brings the
     chrome straight back, and the forward pass is still uninterrupted. */
  function syncImmersive(self) {
    var immersive = !!self.isActive && self.direction !== -1;
    document.documentElement.classList.toggle('cx-immersive', immersive);
  }

  /* The first frame is the base layer: it is simply there when the section
     arrives. Every later frame starts slightly overscaled so it settles as it
     fades up — a layer being composited rather than a hard cut. */
  gsap.set(layers, { opacity: 0, scale: 1.06 });
  gsap.set(layers[0], { opacity: 1, scale: 1 });

  var HOLD = 1;      // beats between the start of one frame and the next
  var FADE = 0.85;   // beats a frame takes to paint in

  var tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: root, start: 'top top',
      /* Scroll distance scales with the number of frames, so every layer gets
         the same dwell whether there are eight images here or twelve. 45% was
         75%: eight frames at that rate pinned the page for 5,466px — six and a
         half screens to get through, and the same again to get back out. */
      end: '+=' + (layers.length * 45) + '%',
      /* 0.4 rather than 1: a full second of catch-up means reversing does
         nothing visible at first, which is most of why this felt stuck. */
      pin: true, scrub: 0.4, anticipatePin: 1, invalidateOnRefresh: true,
      onRefresh: syncImmersive,
      onUpdate: syncImmersive,
      onToggle: syncImmersive
    }
  });

  for (var i = 1; i < layers.length; i++) {
    tl.to(layers[i], { opacity: 1, scale: 1, duration: FADE }, i * HOLD);
  }

  /* A beat of stillness on the finished cover before the pin releases, so the
     last frame is not snatched away the instant it finishes painting. */
  tl.to({}, { duration: HOLD });
})();
