/* ==========================================================================
   Inline "cover built layer-by-layer" experience.
   Pins #cx and scrubs a GSAP timeline through it: eight full-bleed frames of
   the same cover, each fading in over the one before, so scrolling plays the
   build.

   THE PIN IS CREATED EAGERLY — THIS IS THE LOAD-BEARING DETAIL
   It used to be built lazily, inside the preload trigger's onEnter. Pinning
   inserts a pin-spacer roughly 360vh tall at this section's position, so
   creating it late ADDS 360vh of document above wherever the visitor already
   is. Reload mid-page, or a back/forward restore below this section, and the
   spacer appears under you: every bit of content shifts down by three and a
   half screens and the page looks like it jumped back toward the top. The pin
   distance is viewport-relative and the layers are position:absolute inside a
   100vh box, so images can never affect it — there is nothing to wait for.
   The preload still happens one viewport early, on its own trigger; it just no
   longer gates the geometry.

   NO ScrollTrigger.refresh() AFTER THE IMAGES LAND
   Same reason: the layers are absolutely positioned, so decoding an image
   cannot change a single measurement. The old refresh() there was re-measuring
   an unchanged layout and moving the scroll position to do it.

   FRAMES ARE fromTo, NOT to
   A .to() records its start value the first time it renders. Anything that
   invalidates the timeline (a refresh, a language switch) makes the tween
   re-read that start from the LIVE dom — for the frame that happens to be
   mid-fade, that is a partial opacity, so it re-times from wherever it was and
   the frame visibly steps. fromTo states both ends, so a refresh cannot change
   what the timeline means.

   Lenis: motion.js owns the page's single instance and wires
   lenis.on('scroll', ScrollTrigger.update) plus the one gsap.ticker RAF loop
   before this file runs. This file never touches Lenis — not creating one is
   what guarantees there is only ever one.
   ========================================================================== */
(function () {
  var root = document.getElementById('cx');
  if (!root) return;

  var layers = Array.prototype.slice.call(root.querySelectorAll('.layer'));
  if (!layers.length) return;

  if (!window.gsap || !window.ScrollTrigger) {
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

  /* ---- preload, on its own trigger -------------------------------------
     A megabyte of artwork for a section three screens down should not compete
     with the hero, so it starts one viewport early rather than at load. decode()
     is the part that matters: a loaded image can still cost a synchronous
     decode on first paint, which is a dropped frame exactly when the scrub
     starts. Nothing waits on this — it is an optimisation, not a dependency. */
  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom+=100%',
    once: true,
    refreshPriority: -1,
    onEnter: function () {
      layers.forEach(function (layer) {
        var img = layer.querySelector('img');
        if (!img) return;
        img.loading = 'eager';
        if (img.decode) img.decode().catch(function () {});
      });
    },
  });

  /* ---- per-frame character ---------------------------------------------
     One cohesive move per frame, never two frames doing the same thing. The
     numbers are small on purpose: this is a cover being composited, not a
     carousel. Everything below is transform + opacity — the containers never
     move, so nothing here can trigger layout or a ScrollTrigger re-measure.

     y drifts the IMG inside its fixed container. The frames are 16:9 letterboxed
     into a 100vh box, so a few px of vertical travel moves the artwork within
     black that is already there — the mat absorbs it and no lower layer shows.

       hq1 → base plate, a slow push-in under everything
       hq2 → subtle vertical parallax        hq3 → slower, scale-led
       hq4 → vertical movement               hq5 → scale + counter-travel
       hq6 → slower parallax                 hq7 → subtle reveal
       hq8 → controlled parallax, the tightest of the set                    */
  var FRAMES = [
    { scale: 1.00, y:   0 },   // hq1 — base
    { scale: 1.05, y:  14 },   // hq2
    { scale: 1.03, y:   8 },   // hq3
    { scale: 1.06, y:  18 },   // hq4
    { scale: 1.04, y: -12 },   // hq5
    { scale: 1.05, y:  10 },   // hq6
    { scale: 1.03, y:  16 },   // hq7
    { scale: 1.04, y:   9 },   // hq8 — deliberately the smallest travel of the
                               //       eight: it is the frame people stop on.
  ];

  /* Header/float hiding, driven off the trigger state rather than an edge
     event: onToggle alone does not re-fire after a ScrollTrigger.refresh().

     VELOCITY, NOT direction. `direction` flips on the tiny negative deltas
     Lenis produces as it settles, so reading it made the header slide in and
     out every time the visitor stopped scrolling — worst on the last frame,
     which is exactly where people stop to look. A real upward gesture clears
     the threshold; a settle never does. Scrolling up is still how you leave. */
  function syncImmersive(self) {
    var immersive = self.isActive && self.getVelocity() > -260;
    document.documentElement.classList.toggle('cx-immersive', immersive);
  }

  /* ---- responsive + reduced motion, one construct -----------------------
     gsap.matchMedia() builds per breakpoint and reverts everything it made
     when the query stops matching, so a resize across a breakpoint cannot
     leave a second pin behind. Reduced motion simply never builds: the
     stylesheet's .cx-static holds the finished cover and the section still
     scrolls past like any other. */
  var mm = gsap.matchMedia();

  /* Default to the still frame and let a matching breakpoint clear it. A
     browser that reports neither `reduce` nor `no-preference` matches none of
     the queries below, and without this it would sit on eight layers at
     opacity 0 — a black screen. Fail to the finished cover, never to nothing. */
  root.classList.add('cx-static');

  mm.add({
    desktop: '(min-width: 1025px) and (prefers-reduced-motion: no-preference)',
    tablet:  '(min-width: 721px) and (max-width: 1024px) and (prefers-reduced-motion: no-preference)',
    mobile:  '(max-width: 720px) and (prefers-reduced-motion: no-preference)',
    still:   '(prefers-reduced-motion: reduce)',
  }, function (ctx) {
    var c = ctx.conditions;
    if (c.still) return;                       // stylesheet already holds it
    root.classList.remove('cx-static');

    /* Scroll spent per frame, and how much of the per-frame motion survives.
       The phone is not the desktop animation shrunk: the pin is less than half
       as long, the drift is gone entirely and only a whisper of scale is left,
       so it reads as a clean cross-fade instead of a long scrubbed sequence. */
    var perFrame = c.desktop ? 45 : c.tablet ? 34 : 20;   // % of viewport height
    var motion   = c.desktop ? 1  : c.tablet ? 0.6 : 0.35;
    var drift    = c.mobile ? 0 : 1;

    var HOLD = 1;      // beats between the start of one frame and the next
    var FADE = 0.9;    // beats a frame takes to paint in
    /* A real beat of stillness on the finished cover before the pin releases.
       1.6 rather than 1: with scrub lag the playhead is always a little behind
       the scroll, and too short a tail means the section un-pins and scrolls
       away while the LAST frame is still catching up — which is the whole of
       why hq8 looked like it snapped. */
    var TAIL = 1.6;

    function at(i) { return Math.min(i, FRAMES.length - 1); }

    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: '+=' + (layers.length * perFrame) + '%',
        pin: true,
        /* Tight enough that reversing shows something immediately — a full
           second of catch-up is most of why this used to feel stuck — but not
           so tight that a wheel notch reads as a step. */
        scrub: 0.5,
        anticipatePin: 1,
        /* This section sits near the top of the page but its ScrollTrigger is
           created last (motion.js and fx-objects.js run first). Refresh order
           follows creation order unless told otherwise, and a pin re-measured
           after the triggers below it leaves those measuring against a layout
           without this spacer. Lower number = refreshed first. */
        refreshPriority: -1,
        onRefresh: syncImmersive,
        onUpdate: syncImmersive,
        onToggle: syncImmersive,
      },
    });

    /* The base plate is simply there when the section arrives, then pushes in
       fractionally across the whole pin — the floor everything composites onto. */
    var base = layers[0].querySelector('img');
    gsap.set(layers[0], { opacity: 1 });
    if (base && motion > 0.4) {
      tl.fromTo(base,
        { scale: 1, y: 0 },
        { scale: 1 + 0.04 * motion, y: 0, ease: 'none', duration: layers.length * HOLD },
        0);
    }

    for (var i = 1; i < layers.length; i++) {
      var f = FRAMES[at(i)];
      var img = layers[i].querySelector('img');

      /* Opacity on the container, transform on the image inside it. The
         container's geometry never changes, which is what keeps this free of
         layout shift and of anything ScrollTrigger would have to re-measure. */
      tl.fromTo(layers[i],
        { opacity: 0 },
        { opacity: 1, duration: FADE },
        i * HOLD);

      if (img) {
        tl.fromTo(img,
          { scale: 1 + (f.scale - 1) * motion, y: f.y * motion * drift },
          { scale: 1, y: 0, duration: FADE },
          i * HOLD);
      }
    }

    tl.to({}, { duration: TAIL });

    /* matchMedia reverts anything created in here — this timeline, its
       ScrollTrigger and the pin spacer — whenever the query stops matching, so
       a resize across a breakpoint can never leave a second pin behind. What
       it cannot know about is the two classes, so they are undone by hand:
       cx-static goes back on, because between this teardown and the next
       breakpoint's build there is no timeline holding the frames visible. */
    return function () {
      root.classList.add('cx-static');
      document.documentElement.classList.remove('cx-immersive');
    };
  });

  /* Cleanup. Without this a bfcache restore leaves the old pin spacer in the
     document and the section measures against a stale layout. */
  window.addEventListener('pagehide', function () {
    mm.revert();
    document.documentElement.classList.remove('cx-immersive');
  });

  /* Fonts land after first paint and change the height of everything above
     this section, which moves where the pin starts. Safe to refresh now that
     the root is scroll-behavior:auto — the position restore is instant. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
