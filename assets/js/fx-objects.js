/* ==========================================================================
   Floating objects — the 3D forms' scroll behaviour.
   --------------------------------------------------------------------------
   Six cut-out 3D forms are placed through the page by style.css. This file
   gives them the two things CSS cannot: a parallax bound to the real scroll
   position, and a one-shot entrance the first time each one is approached.

   WHAT THIS FILE DELIBERATELY DOES NOT DO
   It does not own the idle drift. That is a CSS animation on the <img> inside
   each object, and it stays there because the two motions have to compose:
   GSAP writes `transform` on the outer span, the keyframes write `transform`
   on the image. Move the drift here and the two would be writing the same
   property on the same element, and one of them would silently stop.

   THREE PROPERTIES, THREE JOBS, NO COLLISIONS
     y                     the scroll parallax   (scrubbed, continuous)
     x / scale / rotation  the entrance          (one shot, on approach)
     opacity               the entrance fade, then handed back to CSS
   The entrance never touches y, so the parallax can own it outright for the
   whole life of the page.

   DEPTH
   Each object carries data-fx — its parallax factor, 0.14 at the back to 0.64
   at the front. It is the same number that sets its opacity in the stylesheet,
   so an object that moves slowly is also the one that sits palest. The travel
   distance is a function rather than a constant so ScrollTrigger can re-read
   it on refresh, which is what keeps the mobile amount correct after a rotate.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;

  // Reduced motion: the objects stay exactly where the stylesheet puts them.
  // They are composition, not decoration — what goes is the movement, and all
  // of it lives in this file and in one @media block in the sheet.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var objects = document.querySelectorAll('.fx');
  if (!objects.length) return;

  // How far an object at depth 1.0 would travel across a full screen of
  // scroll. Narrow screens get roughly a third of it: the same distance that
  // reads as depth on a wide viewport reads as drift on a phone.
  function reach() { return innerWidth < 721 ? 55 : 170; }

  objects.forEach(function (el) {
    var depth = parseFloat(el.getAttribute('data-fx')) || 0.2;

    // The section the object belongs to drives its timing. Anchoring to the
    // object itself would be circular — it is the thing being moved.
    var host = el.closest('section') || el.parentElement;

    function travel() { return depth * reach(); }

    /* ---- parallax ------------------------------------------------------
       Centred on the section: the object is half its travel below its resting
       place as the section arrives and half above it as the section leaves,
       so it passes through the position the stylesheet gives it at roughly
       the moment the section is centred. Scrubbed rather than tweened, with a
       little lag so it settles instead of tracking the wheel exactly. */
    gsap.fromTo(el,
      { y: function () { return travel(); } },
      {
        y: function () { return -travel(); },
        ease: 'none',
        scrollTrigger: {
          trigger: host,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      });

    /* ---- entrance ------------------------------------------------------
       Each object arrives from the side of the screen it is anchored to, so
       it reads as coming from outside the frame and settling into the place
       it belongs rather than fading up on the spot. */
    var box = el.getBoundingClientRect();
    var fromEnd = (box.left + box.width / 2) > innerWidth / 2;
    var dir = fromEnd ? 1 : -1;

    gsap.from(el, {
      x: dir * 80,
      rotation: dir * -6,
      scale: 0.92,
      autoAlpha: 0,
      duration: 1.2,
      // easeOutExpo — the same curve as --ease in the stylesheet. Long tail,
      // no overshoot: these objects are buoyant, and buoyant things settle.
      ease: 'expo.out',
      delay: 0.15,
      scrollTrigger: { trigger: host, start: 'top 85%', once: true },
      // Hand opacity back to the stylesheet once the entrance is done, so the
      // breakpoints that change --fx-o are not overridden by an inline value
      // left behind from whatever width the page happened to load at.
      onComplete: function () { gsap.set(el, { clearProps: 'opacity,visibility' }); },
    });
  });
})();
