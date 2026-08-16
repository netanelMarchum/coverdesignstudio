/* ==========================================================================
   Cookie consent — bilingual, and part of the site rather than bolted to it.
   --------------------------------------------------------------------------
   The previous version carried forty lines of CSS inside this file, complete
   with its own fallback palette: a different orange, two cool greys and its own
   radii. A banner that ships its own colours drifts out of the design system
   the first time the design system moves, and this one had. All of it now lives
   in style.css and is built from .btn, .btn.outline and .eyebrow.

   LANGUAGE
   i18n.js translates by walking the document and snapshotting every Hebrew text
   node at load. This banner does not exist yet when that walk runs, so it can
   never be picked up by it — which is why both languages are written out here
   in full, and why it listens for the cds:lang event instead of hoping.

   THE SETTINGS PANEL
   It names what this site actually stores. There is no analytics category with
   a toggle that does nothing: offering a switch that controls nothing is worse
   than offering no switch at all.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'cds-cookie-consent';   // 'all' | 'essential'  ('1' from the old build)
  var CACHE_PREFIX = 'mt:';         // the translation cache i18n.js writes

  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  var COPY = {
    he: {
      label: 'עוגיות',
      /* The old copy promised analytics, personalisation and "continued use
         means consent". None of the three is true here: nothing on this site
         measures you, and consent is a button, not an inference from you
         still being on the page. Claiming a category you do not have is the
         kind of thing a regulator reads as a misrepresentation, and it is
         also just wrong. This names exactly what gets stored. */
      text: 'האתר שומר במכשיר שלך רק את מה שנדרש כדי שיעבוד: בחירת השפה, ההסכמה הזו ומטמון תרגום מקומי. אין אנליטיקס, אין פרסום ואין מעקב של צד שלישי.',
      accept: 'אישור הכול',
      reject: 'רק ההכרחיות',
      settings: 'ניהול העדפות',
      policy: 'מדיניות פרטיות',
      region: 'הודעת עוגיות',
      essential: 'הכרחיות',
      essentialOn: 'תמיד פעיל',
      essentialText: 'שומרות את בחירת השפה ואת ההסכמה הזו. בלעדיהן האתר לא יזכור שום העדפה.',
      functional: 'פונקציונליות',
      functionalText: 'מטמון תרגום מקומי שמזרז את המעבר לאנגלית.',
      note: 'הפירוט המלא נמצא במדיניות הפרטיות.',
      save: 'שמירה'
    },
    en: {
      label: 'Cookies',
      text: 'This site stores only what it needs to work: your language choice, this consent, and a local translation cache. No analytics, no advertising, no third-party tracking.',
      accept: 'Accept all',
      reject: 'Essential only',
      settings: 'Manage preferences',
      policy: 'Privacy Policy',
      region: 'Cookie notice',
      essential: 'Essential',
      essentialOn: 'Always on',
      essentialText: 'Stores your language choice and this consent. Without them the site remembers no preference.',
      functional: 'Functional',
      functionalText: 'A local translation cache that speeds up switching to English.',
      note: 'The full list is in the Privacy Policy.',
      save: 'Save'
    }
  };

  function lang() {
    return (document.documentElement.lang || 'he').toLowerCase().indexOf('en') === 0 ? 'en' : 'he';
  }

  var el = {};

  function build() {
    var bar = document.createElement('div');
    bar.className = 'cookie-consent';
    // A landmark, not a dialog. It does not trap focus and it does not block
    // the page, and announcing it as a dialog would promise both.
    bar.setAttribute('role', 'region');

    bar.innerHTML =
      '<p class="eyebrow"></p>' +
      '<p class="cc-text"></p>' +
      '<div class="cc-actions">' +
        '<button type="button" class="btn cc-accept"></button>' +
        /* Rejecting has to be exactly as cheap as accepting — same component,
           same size, same row, one click. Burying it behind the settings
           panel (which is where it used to be: open, untick, save) is the
           dark pattern the GDPR guidance names explicitly. */
        '<button type="button" class="btn outline cc-reject"></button>' +
        '<button type="button" class="btn outline cc-settings" aria-expanded="false" aria-controls="cc-panel"></button>' +
        '<a class="cc-link" href="privacy.html"></a>' +
      '</div>' +
      '<div class="cc-panel" id="cc-panel" hidden>' +
        '<div class="cc-row">' +
          '<span class="cc-row-head"><span class="cc-essential-name"></span><span class="cc-state"></span></span>' +
          '<p class="cc-essential-text"></p>' +
        '</div>' +
        '<div class="cc-row">' +
          '<label class="cc-row-head"><span class="cc-functional-name"></span>' +
            '<input type="checkbox" class="cc-functional" checked></label>' +
          '<p class="cc-functional-text"></p>' +
        '</div>' +
        '<p class="cc-note"></p>' +
        '<button type="button" class="btn cc-save"></button>' +
      '</div>';

    el.bar = bar;
    ['eyebrow', 'cc-text', 'cc-accept', 'cc-settings', 'cc-link', 'cc-panel', 'cc-state',
     'cc-note', 'cc-save', 'cc-reject', 'cc-essential-name', 'cc-essential-text',
     'cc-functional-name', 'cc-functional-text', 'cc-functional']
      .forEach(function (c) { el[c] = bar.querySelector('.' + c); });

    el['cc-accept'].addEventListener('click', function () { close('all'); });

    // Drops the translation cache on the way out, so "essential only" actually
    // removes what was already stored rather than only refusing more.
    el['cc-reject'].addEventListener('click', function () {
      clearCache();
      close('essential');
    });

    el['cc-save'].addEventListener('click', function () {
      var keep = el['cc-functional'].checked;
      if (!keep) clearCache();
      close(keep ? 'all' : 'essential');
    });

    el['cc-settings'].addEventListener('click', function () {
      var open = el['cc-panel'].hidden;
      el['cc-panel'].hidden = !open;
      el['cc-settings'].setAttribute('aria-expanded', String(open));
    });

    paint();
    document.body.appendChild(bar);

    // Two frames: one to get the element into the layout at its start state,
    // one for the transition to have something to move from.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add('is-in'); });
    });

    document.addEventListener('cds:lang', paint);
  }

  // Re-reads every string from the copy table. Called on build and again every
  // time the language changes, so the banner is never a sentence behind.
  function paint() {
    var t = COPY[lang()];
    el.bar.setAttribute('aria-label', t.region);
    el.eyebrow.textContent = t.label;
    el['cc-reject'].textContent = t.reject;
    el['cc-text'].textContent = t.text;
    el['cc-accept'].textContent = t.accept;
    el['cc-settings'].textContent = t.settings;
    el['cc-link'].textContent = t.policy;
    el['cc-essential-name'].textContent = t.essential;
    el['cc-state'].textContent = t.essentialOn;
    el['cc-essential-text'].textContent = t.essentialText;
    el['cc-functional-name'].textContent = t.functional;
    el['cc-functional-text'].textContent = t.functionalText;
    el['cc-note'].textContent = t.note;
    el['cc-save'].textContent = t.save;
  }

  function clearCache() {
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(CACHE_PREFIX) === 0) doomed.push(k);
      }
      // Collected first: removing while iterating re-indexes the store and
      // every second key survives.
      doomed.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  function close(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    el.bar.classList.remove('is-in');
    document.removeEventListener('cds:lang', paint);

    var gone = false;
    function drop() {
      if (gone) return;
      gone = true;
      if (el.bar.parentNode) el.bar.parentNode.removeChild(el.bar);
    }
    el.bar.addEventListener('transitionend', drop, { once: true });
    // transitionend never fires under prefers-reduced-motion, where the
    // stylesheet removes the transition entirely.
    setTimeout(drop, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
