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

  // ---- the brief -----------------------------------------------------------
  // No backend, and the page does not pretend otherwise: the button says where
  // the details are going before anybody types them. Same guards the live site
  // uses — a honeypot, a minimum fill time, and a cooldown.
  var form = document.querySelector('.form');
  if (!form) return;

  var msg = form.querySelector('.form-msg');
  var openedAt = Date.now();
  var cooldownUntil = 0;

  function say(text, ok) {
    msg.textContent = text;
    msg.setAttribute('data-state', ok ? 'ok' : 'err');
  }
  function clean(v) {
    return String(v || '').replace(/[<>]/g, '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 500);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (form.querySelector('.hp').value) return;
    if (Date.now() - openedAt < 2500) return say('רגע אחד ונסו שוב.', false);
    if (Date.now() < cooldownUntil) return say('כבר נשלח. המתינו רגע לפני שליחה נוספת.', false);

    var name = clean(form.elements.name.value);
    var phone = clean(form.elements.phone.value);
    var about = clean(form.elements.about.value);

    if (name.length < 2) return say('חסר שם.', false);
    if (!/^[0-9+()\-\s]{7,16}$/.test(phone)) return say('מספר הטלפון לא תקין.', false);

    open('https://wa.me/972559383582?text=' + encodeURIComponent([name, phone, about].filter(Boolean).join(' | ')), '_blank');
    cooldownUntil = Date.now() + 15000;
    say('וואטסאפ נפתח עם הפרטים.', true);
  });
})();
