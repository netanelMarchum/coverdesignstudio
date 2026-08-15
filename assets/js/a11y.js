// Studio Cover Design — Accessibility toolbar (עומד בדרישות תקן ישראלי 5568)
// Self-hosted, no third-party account/API key needed. Settings persist via localStorage
// across every page (Hebrew + English) since they're applied on <html>.
(function () {
  var KEY = 'cds-a11y';
  var STATE_DEFAULT = { contrast: false, grayscale: false, underline: false, noanim: false, readable: false, size: 0 };

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? Object.assign({}, STATE_DEFAULT, JSON.parse(raw)) : Object.assign({}, STATE_DEFAULT);
    } catch (e) { return Object.assign({}, STATE_DEFAULT); }
  }
  function saveState(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function apply(state) {
    var html = document.documentElement;
    html.classList.toggle('a11y-contrast', !!state.contrast);
    html.classList.toggle('a11y-grayscale', !!state.grayscale);
    html.classList.toggle('a11y-underline', !!state.underline);
    html.classList.toggle('a11y-noanim', !!state.noanim);
    html.classList.toggle('a11y-readable', !!state.readable);
    html.setAttribute('data-a11y-size', String(state.size || 0));
  }

  var state = loadState();
  apply(state); // apply immediately, before DOM is even fully parsed if possible

  document.addEventListener('DOMContentLoaded', function () {
    apply(state);

    var fab = document.querySelector('.a11y-fab');
    var panel = document.querySelector('.a11y-panel');
    if (!fab || !panel) return;

    function sync() {
      panel.querySelectorAll('[data-a11y-toggle]').forEach(function (btn) {
        var key = btn.getAttribute('data-a11y-toggle');
        btn.classList.toggle('active', !!state[key]);
      });
    }
    sync();

    fab.setAttribute('aria-expanded', 'false');
    function setOpen(open, restoreFocus) {
      panel.classList.toggle('open', open);
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = panel.querySelector('button');
        if (first) first.focus();
      } else if (restoreFocus) {
        fab.focus();
      }
    }

    fab.addEventListener('click', function () {
      setOpen(!panel.classList.contains('open'), false);
    });
    var closeBtn = panel.querySelector('.a11y-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false, true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false, true);
    });

    panel.querySelectorAll('[data-a11y-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-a11y-toggle');
        state[key] = !state[key];
        apply(state); saveState(state); sync();
      });
    });
    panel.querySelectorAll('[data-a11y-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = parseInt(btn.getAttribute('data-a11y-step'), 10);
        state.size = Math.max(0, Math.min(3, (state.size || 0) + dir));
        apply(state); saveState(state);
      });
    });
    var resetBtn = panel.querySelector('.a11y-reset');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      state = Object.assign({}, STATE_DEFAULT);
      apply(state); saveState(state); sync();
    });

    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && !fab.contains(e.target)) setOpen(false, false);
    });
  });
})();
