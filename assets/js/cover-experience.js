/* ==========================================================================
   Inline "cover built layer-by-layer" experience.
   Pins #cx and scrubs a GSAP timeline through it: eight full-bleed frames of
   the same cover, each fading in over the one before, so scrolling plays the
   build. No panels, no captions, no chrome — just the images.

   THREE THINGS WERE BREAKING IT
   1. Load order. assets/js/motion.js owns the page's single Lenis instance and
      was loading with `defer`, so it ran AFTER this file. The pin was measured
      against native scroll and then Lenis started smoothing underneath it —
      which is what made the section feel stuck. The script order is explicit
      now: motion.js constructs Lenis and wires lenis.on("scroll", ST.update)
      BEFORE this file runs. This file never touches Lenis itself — it does not
      need to, and not creating one is what guarantees there is only ever one.
   2. Lazy images. Seven of the eight frames carried loading="lazy" inside a
      section that is PINNED, so a frame could still be decoding while the
      timeline was already fading it in — you saw the previous frame through a
      blank one. The frames are the animation; they are preloaded and decoded
      before the timeline is built, and ScrollTrigger.refresh() runs after.
   3. Nothing measured after the images landed, so the pin distance was
      computed against a layout that had not finished.

   Preloading happens one viewport early rather than at page load: a megabyte
   of artwork for a section three screens down should not compete with the
   hero, and by the time it is scrolled to, the frames are decoded.
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

  var HOLD = 1;      // beats between the start of one frame and the next
  var FADE = 0.85;   // beats a frame takes to paint in

  var tl = null;
  var prep = null;
  var built = false;

  /* Header/float hiding is driven off isActive rather than an edge event:
     onToggle alone does not re-fire after a ScrollTrigger.refresh() (the
     language switch triggers one), which left the header visible on top of the
     pinned frame. Syncing it idempotently on every hook keeps it honest.

     Only while scrolling DOWN, though. Hiding it in both directions meant that
     once you were inside the pin the site had no header, no floating controls
     and several screens of scrolling in either direction — nothing to leave
     with, which reads as being stuck on the images. */
  function syncImmersive(self) {
    var immersive = !!self.isActive && self.direction !== -1;
    document.documentElement.classList.toggle('cx-immersive', immersive);
  }

  /** Every frame fully fetched AND decoded. decode() is the part that matters:
   *  a loaded image can still cost a synchronous decode on first paint, which
   *  is a dropped frame exactly when the scrub starts. */
  function ready() {
    return Promise.all(layers.map(function (layer) {
      var img = layer.querySelector('img');
      if (!img) return Promise.resolve();
      img.loading = 'eager';
      if (img.decode) return img.decode().catch(function () {});
      if (img.complete) return Promise.resolve();
      return new Promise(function (done) { img.onload = img.onerror = done; });
    }));
  }

  function build() {
    if (built) return;
    built = true;

    /* The first frame is the base layer: it is simply there when the section
       arrives. Every later frame starts slightly overscaled so it settles as it
       fades up — a layer being composited rather than a hard cut. */
    gsap.set(layers, { opacity: 0, scale: 1.06 });
    gsap.set(layers[0], { opacity: 1, scale: 1 });

    tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: root, start: 'top top',
        /* Scroll distance scales with the number of frames, so every layer gets
           the same dwell whether there are eight images here or twelve. */
        end: '+=' + (layers.length * 45) + '%',
        /* 0.4 rather than 1: a full second of catch-up means reversing does
           nothing visible at first, which is most of why this felt stuck. */
        pin: true, scrub: 0.4, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: syncImmersive,
        onUpdate: syncImmersive,
        onToggle: syncImmersive,
      },
    });

    for (var i = 1; i < layers.length; i++) {
      tl.to(layers[i], { opacity: 1, scale: 1, duration: FADE }, i * HOLD);
    }

    /* A beat of stillness on the finished cover before the pin releases, so the
       last frame is not snatched away the instant it finishes painting. */
    tl.to({}, { duration: HOLD });

    /* The pin distance was computed while the frames were still arriving.
       Measure again now that the layout is final. */
    ScrollTrigger.refresh();
  }

  /* A cheap trigger whose only job is to start the preload one viewport early,
     then get out of the way. once:true so it cannot re-fire, and ScrollTrigger
     fires onEnter immediately if the page loads already scrolled past it. */
  prep = ScrollTrigger.create({
    trigger: root,
    start: 'top bottom+=100%',
    once: true,
    onEnter: function () { ready().then(build); },
  });

  /* Cleanup. Without this a bfcache restore or a hot reload leaves the old pin
     spacer in the document and the section measures against a stale layout. */
  function destroy() {
    if (tl) {
      if (tl.scrollTrigger) tl.scrollTrigger.kill(true);
      tl.kill();
      tl = null;
    }
    if (prep) { prep.kill(); prep = null; }
    document.documentElement.classList.remove('cx-immersive');
    built = false;
  }
  window.addEventListener('pagehide', destroy);

  /* Fonts land after first paint and change the height of everything above this
     section, which moves where the pin starts. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
