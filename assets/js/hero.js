/* ==========================================================================
   The hero entrance. One GSAP timeline, every page.
   --------------------------------------------------------------------------
   WHAT THIS REPLACES, AND WHY IT HAD TO GO
   The old entrance was CSS:

     .loaded .intro-copy,.loaded .intro-scroll{animation:introRise …}
     .loaded .intro-logo {animation-delay:…}
     .loaded .intro-lead {animation-delay:…}

   The delays on .intro-logo and .intro-lead were doing nothing at all. Neither
   selector declares an `animation`, and animation-delay on an element with no
   animation is inert. So the four-beat stagger the numbers describe never
   existed: the whole copy block rose as one lump and the scroll cue followed.
   That is what made the hero feel flat, and it is not a thing CSS delays can
   fix — the elements needed to be sequenced against each other, which is what
   a timeline is for.

   THE ORDER IS THE POINT
   Ground, then subject, then support. The ribbon settles first because it is
   the surface everything else sits on; the headline is the reason the page
   exists so it arrives second and alone; the lead follows it closely enough to
   read as one thought; the artwork drifts in underneath while you are already
   reading; the scroll cue is last, because it is an instruction and an
   instruction that arrives before the thing it refers to is noise.

   Overlaps, not gaps. Every beat starts before the one before it has finished
   (the negative offsets below), which is the difference between a sequence and
   a queue. Total run is about 1.1s.

   HANDOFF
   Nothing moves until the preloader is done. script.js fires `cds:loaded` at
   the moment it lifts the curtain; the timeline is built paused and plays on
   that. Built at parse time rather than on the event, so the from-state is
   applied while the curtain is still up and nothing is ever seen jumping to
   its start position.
   ========================================================================== */
(function () {
  'use strict';

  var intro = document.querySelector('.intro');
  if (!intro || !window.gsap) return;

  /* Reduced motion: the stylesheet leaves every one of these visible on its
     own, so returning here is the whole implementation. Nothing to undo. */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var head = intro.querySelector('h1');
  var lead = intro.querySelector('.intro-lead');
  var cue = intro.querySelector('.intro-scroll');
  var ribbon = intro.querySelector('.hero-ribbon');
  var tiles = intro.querySelectorAll('.orbit-tile');

  var mm = gsap.matchMedia();

  mm.add({
    wide: '(min-width: 721px)',
    narrow: '(max-width: 720px)',
  }, function (ctx) {
    // A phone shows the hero at a size where the desktop travel reads as
    // sliding rather than settling, and the orbit tiles are not on screen at
    // all. Shorter throw, tighter stagger, same order.
    var k = ctx.conditions.wide ? 1 : 0.55;

    var tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'expo.out', duration: 0.9 },
    });

    /* 1 — the ground. A wide soft shape, so it scales rather than slides:
       something that large moving laterally reads as a panel, not as light. */
    if (ribbon) {
      tl.from(ribbon, {
        scaleY: 0.82, opacity: 0, transformOrigin: '50% 100%', duration: 1.1,
      }, 0);
    }

    /* 2 — the subject. Uncovered from its own baseline upward while it lifts,
       the same device the preloader mark uses, so the two reveals rhyme.
       clip-path masks and transform paints: neither touches layout, so the
       headline's box never changes width and nothing around it is displaced. */
    if (head) {
      tl.from(head, {
        yPercent: 18 * k,
        opacity: 0,
        clipPath: 'inset(0 0 100% 0)',
        duration: 1,
      }, 0.12);
    }

    /* 3 — the sentence, close enough behind the headline to read as one thought. */
    if (lead) {
      tl.from(lead, { y: 22 * k, opacity: 0, duration: 0.8 }, '-=0.72');
    }

    /* 4 — the artwork, arriving under the copy you are already reading.
       from the centre out, so the field opens rather than sweeping. */
    if (tiles.length) {
      tl.from(tiles, {
        scale: 0.86,
        opacity: 0,
        duration: 0.9,
        stagger: { each: 0.06 * k, from: 'center' },
      }, '-=0.85');
    }

    /* 5 — the instruction, last. */
    if (cue) {
      tl.from(cue, { y: 14, opacity: 0, duration: 0.6 }, '-=0.5');
    }

    /* The scroll cue and the wordmark both own inline styles afterwards
       otherwise, and the stylesheet has breakpoints that need to win. */
    tl.set([head, lead, cue].filter(Boolean), { clearProps: 'clipPath' });

    /* Play when the curtain lifts. On a repeat visit inside the same session
       the preloader is skipped and `loaded` is already on the body by the time
       this runs, so both paths are covered. */
    function play() { tl.play(); }
    if (document.body.classList.contains('loaded')) play();
    else document.addEventListener('cds:loaded', play, { once: true });

    /* Safety net. If the event never lands — a blocked script, a throttled
       background tab — the hero must not sit at its start state forever.
       Longer than the preloader's own 2.5s cap, so it never pre-empts it. */
    var failsafe = setTimeout(play, 3000);

    return function () {
      clearTimeout(failsafe);
      document.removeEventListener('cds:loaded', play);
    };
  });
})();
