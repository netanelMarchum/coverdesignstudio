/* ==========================================================================
   Language boot — the only script on the site that blocks rendering, and the
   reason is the flash it exists to prevent.
   --------------------------------------------------------------------------
   i18n.js is deferred, so on a return visit in English the first painted frame
   was the Hebrew document: RTL, right-aligned, the whole composition mirrored —
   and then it flipped. Every direction-dependent thing moved at once. The bar,
   the section heads, the floating objects, the scroll rail.

   Reading one localStorage key and stamping two attributes on <html> costs
   well under a millisecond and has to happen before the first paint, which
   means before the parser reaches <body>. That is what a blocking script in
   the head is for.

   WHY NOT INLINE
   It would be one line in the head and no request at all — but the site's CSP
   sets script-src 'self' with no 'unsafe-inline', so the browser would refuse
   to run it. A hash would work and would then have to be recomputed in
   vercel.json on every edit to this file. A same-origin file is cached
   immutably for a year and cannot fall out of step.

   This file only sets direction. i18n.js still owns the text, and it reads the
   same key, so the two cannot disagree.
   ========================================================================== */
(function () {
  try {
    if (localStorage.getItem('lang') !== 'en') return;
    var h = document.documentElement;
    h.setAttribute('lang', 'en');
    h.setAttribute('dir', 'ltr');
  } catch (e) {
    /* Private mode, or storage disabled. The document already carries the
       Hebrew defaults in its markup, so there is nothing to correct. */
  }
})();
