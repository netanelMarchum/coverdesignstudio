// Site behavior

// Preloader: the full curtain + logo-reveal animation plays once per
// browser session. After that, switching pages (including the HE/EN
// language toggle) never re-triggers it — the loader is just hidden
// instantly so navigation feels immediate.
document.addEventListener('DOMContentLoaded', function () {
  var wrap = document.getElementById('loader-wrapper');
  var seen = false;
  try { seen = sessionStorage.getItem('cds-intro-seen') === '1'; } catch (e) {}

  if (seen || !wrap) {
    document.body.classList.add('loaded');
    if (wrap) wrap.style.display = 'none';
    return;
  }

  // Nothing to drive: the curtain holds the logo mark while its CSS reveal
  // plays, then lifts. The progress bar and percentage counter that used to be
  // built here are gone with the rest of the loader's furniture.
  var revealed = false;
  var loaded = false;
  var mark = wrap.querySelector('.loader-mark');

  // Reduced motion kills the keyframes outright, so animationend never fires
  // and waiting on it would hold the curtain until the safety cap.
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var swept = !mark || reduce;

  function reveal() {
    if (revealed) return; revealed = true;
    document.body.classList.add('loaded');
    try { sessionStorage.setItem('cds-intro-seen', '1'); } catch (e) {}
  }
  // Both conditions have to be true: the page is ready AND the mark has
  // finished drawing. Either one arriving last is what lifts the curtain.
  function maybeReveal() { if (loaded && swept) reveal(); }

  // The reveal runs ~0.85s. On a warm cache `load` fires well inside that, so a
  // fixed delay would split the curtain with the logo half-drawn.
  if (mark && !reduce) {
    mark.addEventListener('animationend', function (e) {
      if (e.animationName === 'loaderReveal') { swept = true; maybeReveal(); }
    });
  }

  function finish() { loaded = true; maybeReveal(); }

  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
  // Safety cap: forces the curtain up even if `load` or animationend never
  // land (a stalled asset, a throttled background tab, a blocked animation).
  // 2.5s, not 4.5: the cap is the worst case a real visitor sits through, and
  // four and a half seconds of black is longer than anyone waits.
  setTimeout(reveal, 2500);
});

// Burger menu
var burger = document.querySelector('.burger');
var nav = document.querySelector('.main-nav');
if (burger && nav) {
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'main-nav');
  nav.id = nav.id || 'main-nav';

  // The panel covers the viewport, so the page behind it must not scroll: a
  // menu that scrolls the content underneath it reads as two surfaces fighting.
  function setOpen(open, restoreFocus) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (restoreFocus) {
      burger.focus();
    }
  }

  burger.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'), false);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setOpen(false, false);
  });
  // Escape is the way out of every overlay on the platform; a drawer that only
  // closes by finding the same small button again is a trap on a phone.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false, true);
  });
  // Leaving the breakpoint with the drawer open would strand overflow:hidden on
  // the body while the nav is back to being a pill in the header.
  addEventListener('resize', function () {
    if (innerWidth > 920 && nav.classList.contains('open')) setOpen(false, false);
  }, { passive: true });
}

// Header: transparent while it sits over the intro band, solid after.
// Also publishes the measured header height as --header-h, which the intro
// uses to slide up underneath it (see .intro in the stylesheet).
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var root = document.documentElement;
  var band = document.querySelector('.intro');
  var ticking = false;

  function measure() {
    root.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  function sync() {
    ticking = false;
    if (band) root.classList.toggle('hdr-over', band.getBoundingClientRect().bottom > header.offsetHeight);
  }
  function onResize() { measure(); sync(); }

  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  addEventListener('load', onResize);   // webfonts can change the header height
  onResize();
})();

// Scroll cue: jumps to whatever section follows the intro, so no page needs to
// agree on an id for its first block.
(function () {
  var cue = document.querySelector('.intro-scroll');
  var band = document.querySelector('.intro');
  if (!cue || !band || !band.nextElementSibling) return;
  cue.addEventListener('click', function () {
    band.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

// Scroll reveal — the site's single entrance-animation system.
//
// .reveal starts at opacity 0, so if the observer never delivers, whole
// sections stay invisible — the worst failure mode this page has. Browsers do
// suppress IntersectionObserver entirely in background tabs (it resumes on
// focus), and an observer can be broken by extensions, so there is a failsafe:
// if nothing has been delivered shortly after the page is actually visible,
// reveal everything outright. Better an un-animated page than a blank one.
(function () {
  var els = [].slice.call(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  function revealAll() {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  if (!('IntersectionObserver' in window)) { revealAll(); return; }

  var delivered = false;
  var io = new IntersectionObserver(function (entries) {
    delivered = true;
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
    // Spec: fire when 15-20% of the block is on screen. It was 10%, which
  // tripped while the section was still essentially off the bottom edge.
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) { io.observe(el); });

  // Count the grace period from when the tab is genuinely visible, otherwise a
  // page opened in a background tab would trip the failsafe and lose its
  // entrance animation for no reason.
  function armFailsafe() {
    setTimeout(function () {
      if (delivered) return;
      if (document.hidden) { once(); return; }
      revealAll();
    }, 2500);
  }
  function once() {
    document.addEventListener('visibilitychange', function h() {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', h);
      armFailsafe();
    });
  }
  if (document.hidden) once(); else armFailsafe();
})();

// Video department: category tabs
var vidTabs = document.querySelectorAll('.vid-tab');
if (vidTabs.length) {
  vidTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      vidTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.vid-panel').forEach(function (p) {
        var on = p.getAttribute('data-panel') === target;
        p.classList.toggle('active', on);
        // Panels start at display:none, so their .reveal blocks have never
        // intersected and are still at opacity 0. The observer cannot be
        // relied on to catch them now either — a short panel can land entirely
        // above the fold and never intersect again — so the newly shown panel
        // reveals itself. The stagger still plays: it is driven by .in.
        if (on) {
          p.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
        }
      });
    });
  });
}

// Contact form -> validates + sanitizes input, then opens WhatsApp with the
// message prefilled. There is no backend, so this also carries the site's
// best-effort spam protection: a honeypot field, a minimum fill-time trap,
// and a client-side resend cooldown (real rate limiting still needs a
// server; see production checklist notes).
var FORM_COOLDOWN_MS = 15000;
var FORM_MIN_FILL_MS = 2500;
var pageLoadedAt = Date.now();

function sanitizeField(v) {
  return String(v || '')
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isValidPhone(v) { return /^[0-9+()\-\s]{7,16}$/.test(v); }

document.querySelectorAll('.contact-form').forEach(function (form) {
  var isHe = form.getAttribute('data-lang') !== 'en';
  var msgEl = form.querySelector('.form-msg');
  var submitBtn = form.querySelector('button[type="submit"]');
  var cooldownUntil = 0;

  function setMsg(text, ok) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.classList.toggle('ok', !!ok);
    msgEl.classList.toggle('err', !ok);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var hp = form.querySelector('.hp-field');
    if (hp && hp.value) return; // honeypot tripped — silently drop

    if (Date.now() - pageLoadedAt < FORM_MIN_FILL_MS) {
      setMsg(isHe ? 'נא לנסות שוב בעוד רגע.' : 'Please try again in a moment.', false);
      return;
    }
    if (Date.now() < cooldownUntil) {
      setMsg(isHe ? 'ההודעה כבר נשלחה — נא להמתין קצת לפני שליחה נוספת.' : 'Already sent — please wait before sending again.', false);
      return;
    }

    var nameField = form.querySelector('[name="name"]');
    var phoneField = form.querySelector('[name="phone"]');
    var emailField = form.querySelector('[name="email"]');
    var subjectField = form.querySelector('[name="subject"]');

    var name = sanitizeField(nameField && nameField.value);
    var phone = sanitizeField(phoneField && phoneField.value);
    var email = sanitizeField(emailField && emailField.value);
    var subject = sanitizeField(subjectField && subjectField.value);

    if (name.length < 2) {
      setMsg(isHe ? 'נא למלא שם תקין.' : 'Please enter a valid name.', false);
      return;
    }
    if (!isValidPhone(phone)) {
      setMsg(isHe ? 'נא למלא מספר טלפון תקין.' : 'Please enter a valid phone number.', false);
      return;
    }
    if (!isValidEmail(email)) {
      setMsg(isHe ? 'נא למלא כתובת אימייל תקינה.' : 'Please enter a valid email address.', false);
      return;
    }

    var msg = [name, phone, email, subject].filter(Boolean).join(' | ');
    open('https://wa.me/972559383582?text=' + encodeURIComponent(msg), '_blank');

    cooldownUntil = Date.now() + FORM_COOLDOWN_MS;
    setMsg(isHe ? 'נפתח WhatsApp עם ההודעה שלכם ✓' : 'WhatsApp opened with your message ✓', true);
    if (submitBtn) {
      submitBtn.disabled = true;
      setTimeout(function () { submitBtn.disabled = false; }, FORM_COOLDOWN_MS);
    }
  });
});

// ---------------------------------------------------------------------------
// Page + language transitions.
//
// The veil (.page-veil) is in the markup and fades ITSELF out via CSS on every
// load, so the first painted frame is already covered — nothing can flash.
// This module only drives the other direction: cover, do the work, uncover.
//
// Exposed as window.pageTransition so i18n.js reuses the exact same veil and
// timing for the HE/EN swap instead of inventing a second, competing one.
// ---------------------------------------------------------------------------
window.pageTransition = (function () {
  var veil = document.querySelector('.page-veil');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var busy = false;

  // Read the durations from CSS so there is one source of truth for timing.
  function ms(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!v) return fallback;
    return v.slice(-2) === 'ms' ? parseFloat(v) : parseFloat(v) * 1000;
  }
  var OUT = reduce ? 0 : ms('--d-veil-out', 240);
  var IN = reduce ? 0 : ms('--d-veil-in', 320);

  // Settle the veil once the entry animation finishes.
  //
  // The failsafe matters: browsers freeze CSS animations in background tabs, so
  // a page opened in one sits with the veil at full opacity and animationend
  // never fires. It is invisible while hidden, but the veil must not still be
  // up when the tab is focused — and the same guard covers any other case where
  // the animation is interrupted or never runs.
  function settle() {
    if (veil) veil.classList.add('is-idle');
  }
  if (veil) {
    if (reduce) settle();
    else {
      veil.addEventListener('animationend', settle, { once: true });
      var failsafe = setTimeout(settle, IN + 400);
      document.addEventListener('visibilitychange', function () {
        // Re-arm from the moment the tab is actually visible: a throttled
        // animation only starts running now.
        if (document.hidden || busy) return;
        clearTimeout(failsafe);
        failsafe = setTimeout(settle, IN + 400);
      });
    }
  }

  // Run `cb` once the browser has had a chance to lay out — after two frames
  // when it is painting, or on a timer when it is not. rAF is starved in
  // background tabs, and relying on it alone strands the veil at full opacity
  // until the tab is focused again.
  function afterLayout(cb) {
    var done = false;
    function once() { if (!done) { done = true; cb(); } }
    requestAnimationFrame(function () { requestAnimationFrame(once); });
    setTimeout(once, 64);
  }

  /** Fade the veil in, run `work()` behind it, then fade back out. */
  function cover(work) {
    if (!veil || reduce) { work(); return Promise.resolve(); }
    if (busy) return Promise.resolve();
    busy = true;
    settle();                        // retire the entry animation so transitions apply
    // force a style flush so the class change transitions instead of snapping
    void veil.offsetWidth;
    veil.classList.add('is-leaving');

    return new Promise(function (resolve) {
      setTimeout(function () {
        try { work(); } finally {
          // let the swapped content lay out before revealing it
          afterLayout(function () {
            veil.classList.remove('is-leaving');   // transitions back to 0
            setTimeout(function () {
              busy = false;
              resolve();
            }, IN);
          });
        }
      }, OUT);
    });
  }

  /** Fade out and hand over to a new document — the veil stays up until unload. */
  function leave(url) {
    if (busy) return;
    busy = true;
    if (!veil || reduce) { window.location.href = url; return; }
    settle();
    void veil.offsetWidth;
    veil.classList.add('is-leaving');
    setTimeout(function () { window.location.href = url; }, OUT);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target;
    while (a && a.nodeName && a.nodeName !== 'A') a = a.parentNode;
    if (!a || a.nodeName !== 'A') return;

    var href = a.getAttribute('href');
    if (!href) return;
    if (a.target && a.target !== '_self') return;      // opens in new tab
    if (a.hasAttribute('download')) return;
    if (href.charAt(0) === '#') return;                // in-page anchor
    if (a.closest('.lang-switch')) return;             // i18n.js handles these

    var proto = (href.split(':')[0] || '').toLowerCase();
    if (proto === 'mailto' || proto === 'tel' || proto === 'whatsapp') return;
    if (a.hostname && a.hostname !== location.hostname) return; // external

    e.preventDefault();
    leave(a.href);
  }, false);

  // Returning via the back/forward cache restores the DOM as it was when we
  // left — veil opaque, mid-navigation. Clear it or the page stays covered.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !veil) return;
    busy = false;
    veil.classList.add('is-idle');
    veil.classList.remove('is-leaving');
  });

  return { cover: cover, leave: leave, outMs: OUT, inMs: IN };
})();


// Reel cards (video page): play only while on screen, and let the viewer
// unmute per card. Reduced-motion users keep the static poster frame.
(function () {
  var reels = document.querySelectorAll('.reel-video');
  if (!reels.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.5 });
    reels.forEach(function (v) { io.observe(v); });
  }

  document.querySelectorAll('.reel-sound').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.parentElement.querySelector('.reel-video');
      if (!v) return;
      v.muted = !v.muted;
      // Both icons are in the markup; CSS shows one. The script only states
      // which, so the button's accessible name and its drawing cannot drift
      // apart the way they did when the glyph was rewritten here.
      btn.setAttribute('data-muted', String(v.muted));
      btn.setAttribute('aria-label', v.muted ? 'הפעלת סאונד' : 'השתקה');
      if (!v.muted) v.play().catch(function () {});
    });
  });
})();



// Background showreel — loaded only if it is going to be watched.
//
// The file is 63MB / 85s. Attaching it as a normal autoplay background would
// pull that down on every visit, on every connection, before anyone had
// scrolled to it. So the <video> ships with no src at all: the poster carries
// the section until the observer decides the video is worth fetching.
//
// It is never fetched at all when the visitor has asked for reduced motion or
// has Save-Data on — in both cases the poster frame is the finished design.
(function () {
  var wraps = [].slice.call(document.querySelectorAll('.section-video'));
  if (!wraps.length) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var thrifty = conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
  if (reduce || thrifty || !('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var v = en.target.querySelector('video[data-src]');
      io.unobserve(en.target);
      if (!v) return;
      v.src = v.dataset.src;
      delete v.dataset.src;
      // Autoplay can still be refused; the poster stays put if it is.
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }, { rootMargin: '200px 0px' });   // a screen of warning, not a screen of waste

  wraps.forEach(function (w) { io.observe(w); });
})();
