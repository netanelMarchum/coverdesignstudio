/* ==========================================================================
   Floating objects — the 3D forms' scroll behaviour.
   --------------------------------------------------------------------------
   Eight cut-out 3D forms are placed through the page by style.css. This file
   gives them what CSS cannot: motion bound to the real scroll position, and a
   one-shot entrance the first time each one is approached.

   THE TRANSFORM BUDGET — WHY NOTHING HERE FIGHTS ANYTHING
   Three elements, three owners, and no property is written by two of them:

     .fx        (outer span)  GSAP  · scroll motion:  y, and where configured
                                      rotation (flat, Z only) / scale
     .fx > img  (inner img)   CSS   · idle drift:     translate3d + rotate,
                                      one @keyframes, per-object vars
     .fx        entrance      GSAP  · x, scale, autoAlpha — one shot, never y

   The idle drift stays in the stylesheet precisely so it composes: GSAP writes
   `transform` on the span while the keyframes write `transform` on the image
   inside it. Move the drift in here and the two would be writing the same
   property on the same element, and whichever ran second would silently win.
   That is the wrapper hierarchy — it is already the architecture, it just
   happens to be spelled span/img rather than div/div.

   The entrance never touches y, so the scroll motion owns y outright for the
   whole life of the page. The climber's scale is set by its scroll tween; its
   entrance therefore fades and slides only, and does not scale.

   NOTHING FLIPS. There is no rotationY in this file and no 3D turn anywhere in
   the set. Every rotation is flat — in the plane of the screen, Z only, a
   quarter-turn at most. These forms are lit cut-outs: tipping one toward the
   viewer takes it through edge-on and brings it back mirrored, which reads as
   a glitch rather than as depth. Depth here comes from parallax rate, scale
   and opacity, which is where it came from before and is cheaper besides.

   BEHAVIOURS ARE ASSIGNED, NOT GUESSED
   Every object has one named behaviour in FX below, keyed by its class. Nothing
   is random and nothing is derived from DOM order, so the composition is
   identical on every load and a change here is a change you can see.

     drift    parallax only — the soft masses. A large blurred form that
              rotates reads as a wobbling background, which is the exact
              failure mode that makes a page look decorated rather than
              art-directed. wave, ribbon, blob, orb-pale, orb-lime.
     turn     parallax + a flat quarter-turn on scroll. Only for forms with a
              readable axis, and the two turn opposite ways. wire, ring.
     rise     the one object that travels — y upward, a flat quarter-turn and
              a scale taper, all scrubbed together. Only the trefoil: it is the
              one silhouette in the set whose orientation is legible, so the
              turn actually reads. On a sphere the same tween is invisible — a
              glossy ball rotated 90° is the same picture, minus a moved
              highlight — which is why not one of the five spheres gets it.

   DEPTH
   data-fx is the parallax factor, 0.14 at the back to 0.64 at the front, and
   it is the same number that drives opacity in the stylesheet: the further
   back, the paler AND the slower. Travel is a function rather than a constant
   so ScrollTrigger re-reads it on refresh, which keeps the amount correct
   after a rotate or a resize across a breakpoint.
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

  /* ---- the assignment table -------------------------------------------
     One row per object. `depth` is read from data-fx in the markup so the
     stylesheet and this file cannot disagree about it. */
  var FX = {
    'fx-wave':     { type: 'drift'  },
    'fx-ribbon':   { type: 'drift'  },
    'fx-blob':     { type: 'drift'  },
    'fx-orb-pale': { type: 'drift'  },
    'fx-orb-lime': { type: 'drift'  },
    /* A ring and a thin line: the two forms in the set with a readable axis.
       A quarter-turn IN THE PLANE across a whole section — flat rotation only.
       Nothing tips toward or away from the viewer: these are cut-out PNGs with
       a lit front, so a rotationY would have carried them through their own
       edge and shown a back face that does not exist. The wire is nearest and
       sits in front of the content, so it turns the opposite way to the ring —
       counter-rotation is what stops the two reading as one gesture. */
    'fx-ring':     { type: 'turn', rotation: 90 },
    'fx-wire':     { type: 'turn', rotation: -90 },
    /* The one object that travels. It RISES: it enters low on the side the
       section head leaves empty and climbs past the covers grid as you scroll
       down, turning a quarter-turn on the way. Rising rather than falling is
       what makes it read as buoyant — the same idea as the rest of the set,
       just with enough travel that you actually catch it doing it. The scale
       taper sells the climb as receding rather than sliding. */
    'fx-trefoil':  { type: 'rise', lift: 420, rotation: 90, scale: 0.8 },
  };

  // How far an object at depth 1.0 would travel across a full screen of
  // scroll. Narrow screens get roughly a third of it: the same distance that
  // reads as depth on a wide viewport reads as drift on a phone.
  //
  // Raised from 170. At the old amount the objects moved, but under a fifth of
  // a screen over an entire section — slower than the content scrolling past
  // them, so they read as stuck to the page rather than floating through it.
  // Parallax you cannot notice is parallax you are paying for and not getting.
  function reach() { return innerWidth < 721 ? 82 : 265; }

  // Everything scroll-driven gets scaled by this, so one number calms the
  // whole composition on a small screen rather than fifteen tuned constants.
  function damp() { return innerWidth < 721 ? 0.35 : innerWidth < 1025 ? 0.65 : 1; }

  /* ---- the behaviours ---------------------------------------------------
     Each takes (el, host, cfg) and owns a disjoint set of properties. They all
     return nothing; the ScrollTrigger is attached to the tween. */

  /* Centred on the section: the object is half its travel below its resting
     place as the section arrives and half above it as the section leaves, so
     it passes through the position the stylesheet gives it at roughly the
     moment the section is centred. Scrubbed with a little lag so it settles
     instead of tracking the wheel exactly. */
  function createScrollParallax(el, host, cfg) {
    gsap.fromTo(el,
      { y: function () { return cfg.travel(); } },
      {
        y: function () { return -cfg.travel(); },
        ease: 'none',
        scrollTrigger: {
          trigger: host, start: 'top bottom', end: 'bottom top',
          scrub: 0.9, invalidateOnRefresh: true,
        },
      });
  }

  /* Rotation only — y is left alone so createScrollParallax can own it. The
     two tweens therefore compose on the same element without overlapping.

     `rotation` and nothing else. rotationY tips the form toward the viewer and
     at the halfway point of any such turn the object is edge-on and gone, then
     comes back mirrored — on a lit cut-out that is a different object, not a
     turned one. The whole configured angle is spent turning in the plane, and
     it is split around the resting angle so the object sits where the
     stylesheet puts it at the middle of the section rather than arriving
     already rotated. */
  function createScrollRotation(el, host, cfg) {
    gsap.fromTo(el,
      { rotation: function () { return -cfg.rotation * damp() / 2; } },
      {
        rotation: function () { return cfg.rotation * damp() / 2; },
        ease: 'none',
        scrollTrigger: {
          trigger: host, start: 'top bottom', end: 'bottom top',
          scrub: 1, invalidateOnRefresh: true,
        },
      });
  }

  /* The climb. One tween so y, rotation and scale stay locked to each other —
     three separate tweens on the same element with the same trigger would be
     three ScrollTriggers doing one job. Scrubbed, so scrolling back up
     reverses it exactly; nothing here is a one-way move.

     y runs POSITIVE to NEGATIVE: the object starts below its resting place and
     climbs past it, so scrolling down lifts it up the screen. It is the same
     sign convention as the parallax, just with a lot more of it — this is the
     one object in the set you are meant to catch moving. */
  function createScrollRise(el, host, cfg) {
    gsap.fromTo(el,
      { y: function () { return cfg.lift * damp() / 2; },
        rotation: function () { return -cfg.rotation * damp() / 2; },
        scale: 1 },
      {
        y: function () { return -cfg.lift * damp() / 2; },
        rotation: function () { return cfg.rotation * damp() / 2; },
        scale: function () { return 1 - (1 - cfg.scale) * damp(); },
        ease: 'none',
        scrollTrigger: {
          trigger: host, start: 'top bottom', end: 'bottom top',
          scrub: 1.1, invalidateOnRefresh: true,
        },
      });
  }

  /* Each object arrives from the side of the screen it is anchored to, so it
     reads as coming from outside the frame and settling into the place it
     belongs rather than fading up on the spot. */
  function createEntrance(el, host, cfg) {
    var box = el.getBoundingClientRect();
    var dir = (box.left + box.width / 2) > innerWidth / 2 ? 1 : -1;
    var vars = {
      x: dir * 80,
      rotation: dir * -6,
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
    };
    // The climber's scale and rotation belong to its scroll tween for the whole
    // life of the page. An entrance that also wrote them would be a second
    // owner of the same properties — the one collision this file exists to
    // avoid — so it arrives on x and opacity alone.
    if (cfg.type !== 'rise') { vars.scale = 0.92; } else { delete vars.rotation; }
    gsap.from(el, vars);
  }

  var BEHAVIOUR = {
    drift: [createScrollParallax],
    turn:  [createScrollParallax, createScrollRotation],
    rise:  [createScrollRise],
  };

  Array.prototype.forEach.call(objects, function (el) {
    // The behaviour key is the fx-* class that is not the base class.
    var key = null;
    Array.prototype.forEach.call(el.classList, function (c) {
      if (c.indexOf('fx-') === 0 && FX[c]) key = c;
    });
    var cfg = key ? FX[key] : null;
    if (!cfg) return;                    // .fx-front and friends carry no behaviour

    var depth = parseFloat(el.getAttribute('data-fx')) || 0.2;
    cfg = Object.assign({}, cfg, { travel: function () { return depth * reach(); } });

    // The section the object belongs to drives its timing. Anchoring to the
    // object itself would be circular — it is the thing being moved.
    var host = el.closest('section') || el.parentElement;

    BEHAVIOUR[cfg.type].forEach(function (fn) { fn(el, host, cfg); });
    createEntrance(el, host, cfg);
  });
})();
