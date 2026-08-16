// Studio Cover Design — alternative homepage behaviour.
//
// Three things happen on this page and nothing else does:
//   1. the scale test loads a cover at four sizes at once, and you can change
//      which cover that is;
//   2. the counter under the master frame states the size it is standing in for
//      while the opening animation runs;
//   3. the brief hands off to WhatsApp, and says so on the button.
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the scale test ------------------------------------------------------
  var frames = [].slice.call(document.querySelectorAll('[data-cover]'));
  var picker = document.querySelector('.picker');
  var showing = document.querySelector('.now-showing');

  function show(btn) {
    var src = btn.getAttribute('data-src');
    frames.forEach(function (img) { img.src = src; });
    if (showing) {
      showing.innerHTML = '<b></b> <span></span>';
      showing.firstChild.textContent = btn.getAttribute('data-title');
      showing.lastChild.textContent = btn.getAttribute('data-artist');
    }
    picker.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === btn));
    });
  }

  if (picker) {
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (btn) show(btn);
    });
  }

  // ---- the opening moment --------------------------------------------------
  // The master cover comes up from the footprint of the 64px rung and settles
  // at full size while the label counts through the sizes it passes. That is
  // the page's whole argument, made once, before the headline has been read.
  //
  // Driven here rather than in CSS on purpose: a class added by a deferred
  // script paints the finished state for a frame and then snaps back to the
  // start. Run from script, the page without JS is simply already arrived.
  var master = document.querySelector('.master');
  var counter = document.querySelector('[data-counter]');
  var EASE = 'cubic-bezier(.2,.8,.2,1)';

  if (master && !reduce && master.animate) {
    master.animate(
      [{ transform: 'scale(.16)', opacity: .25 },
       { opacity: 1, offset: .6 },
       { transform: 'scale(1)', opacity: 1 }],
      { duration: 950, easing: EASE }
    );

    if (counter) {
      // The label names the size the frame is standing in for as it grows, so
      // the motion reads as a change of scale and not as a decorative zoom.
      [[0, '64'], [280, '300'], [520, '640'], [760, '3000']].forEach(function (step) {
        setTimeout(function () { counter.textContent = step[1]; }, step[0]);
      });
    }

    [].slice.call(document.querySelectorAll('.rungs,.now-showing,.picker')).forEach(function (el, i) {
      el.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, delay: 480 + i * 70, easing: EASE, fill: 'backwards' }
      );
    });
  }

  // The brief form is bound by assets/js/forms.js along with every other form.
})();
