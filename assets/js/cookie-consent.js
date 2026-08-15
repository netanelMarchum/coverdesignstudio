/* ==========================================================================
   Cookie consent — self-contained, bilingual (HE / EN).
   Shows a dismissible banner until the visitor clicks "Accept".
   Choice is remembered in localStorage so it never nags again.
   ========================================================================== */
(function () {
  var KEY = 'cds-cookie-consent';

  // already accepted? do nothing.
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) {}

  var isEn = (document.documentElement.lang || 'he').toLowerCase().indexOf('en') === 0;
  var inEnDir = location.pathname.indexOf('/en/') !== -1;
  var privacyHref = inEnDir ? '../privacy.html' : 'privacy.html';

  var t = isEn ? {
    text: 'This website uses cookies to ensure you get the best experience on our website.',
    policy: 'Cookies Policy',
    accept: 'Accept'
  } : {
    text: 'אתר זה משתמש בעוגיות (Cookies) כדי להבטיח לך את החוויה הטובה ביותר באתר.',
    policy: 'מדיניות עוגיות',
    accept: 'אישור'
  };

  // Every value here is a token from the stylesheet. The fallbacks after each
  // comma are only for the case where this script somehow runs without it — and
  // they are the SAME colours, not a second palette: the previous set carried a
  // different orange (#FF7002), two cool greys and its own radii, so the banner
  // was visibly not part of the site it appeared on.
  //
  // z-index: --z-consent, which the ladder in the stylesheet reserves for
  // exactly this element. It was 1000 — the preloader's layer, above the page
  // transition veil, so the banner stayed lit over a covered page.
  //
  // The button is dark ink on the brand orange, never white: white on this
  // orange measures 2.62:1 and fails AA at any size the button would use.
  var css = '' +
    '.cookie-consent{position:fixed;inset-inline:var(--s-4,16px);bottom:var(--s-4,16px);' +
    'z-index:var(--z-consent,400);max-width:560px;margin-inline:auto;background:#fff;' +
    'color:var(--text,#0A0A0A);border:1px solid var(--border,rgba(10,10,10,.1));' +
    'border-radius:var(--r-md,20px);box-shadow:var(--sh-overlay,0 24px 60px -12px rgba(0,0,0,.28));' +
    'padding:var(--s-4,16px) var(--s-5,24px);' +
    'display:flex;flex-wrap:wrap;align-items:center;gap:var(--s-4,16px);font-family:var(--font,inherit);' +
    'font-weight:300;transform:translateY(24px);opacity:0;' +
    'transition:transform var(--d-mid,.32s) var(--ease,ease),opacity var(--d-mid,.32s) var(--ease,ease)}' +
    '.cookie-consent.show{transform:none;opacity:1}' +
    '.cookie-consent p{margin:0;flex:1 1 240px;font-size:.92rem;line-height:1.55;color:var(--text-dim,#4B4B4B)}' +
    '.cookie-consent a{color:var(--text,#0A0A0A);font-weight:700;text-decoration:underline}' +
    '.cookie-consent .cc-accept{flex:0 0 auto;background:var(--accent,#F38218);color:var(--dark,#0A0A0A);border:0;' +
    'border-radius:var(--r-lg,9999px);padding:11px 30px;font-family:inherit;font-weight:700;font-size:.95rem;' +
    'cursor:pointer;transition:transform var(--d-fast,.18s) var(--ease,ease),box-shadow var(--d-fast,.18s) var(--ease,ease);' +
    'box-shadow:var(--sh-accent,0 14px 34px -10px rgba(243,130,24,.5))}' +
    '.cookie-consent .cc-accept:hover{transform:translateY(var(--lift-btn,-2px));box-shadow:var(--sh-3,0 24px 60px -18px rgba(10,10,10,.22))}' +
    '.cookie-consent .cc-accept:active{transform:scale(.98);transition-duration:var(--d-press,.1s)}' +
    '@media (max-width:520px){.cookie-consent{flex-direction:column;align-items:stretch;text-align:center}' +
    '.cookie-consent .cc-accept{width:100%}}' +
    '@media (prefers-reduced-motion:reduce){.cookie-consent{transition:none}}';

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.className = 'cookie-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('aria-label', isEn ? 'Cookie notice' : 'הודעת עוגיות');

    var p = document.createElement('p');
    p.appendChild(document.createTextNode(t.text + ' '));
    var link = document.createElement('a');
    link.href = privacyHref;
    link.textContent = t.policy;
    p.appendChild(link);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cc-accept';
    btn.textContent = t.accept;
    btn.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      bar.classList.remove('show');
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 500);
    });

    bar.appendChild(p);
    bar.appendChild(btn);
    document.body.appendChild(bar);

    // let the entrance transition run
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add('show'); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
