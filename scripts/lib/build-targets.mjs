// Single source of truth for what gets minified.
//
// Shared by scripts/build.mjs (production) and scripts/dev.mjs (watch), so the
// dev server can never serve a different set of files than the build produces.
//
// Every asset the pages actually load is listed here. Previously only style.css
// and script.js were minified while six other scripts shipped as raw source.

/** @type {{in: string, out: string}[]} */
export const targets = [
  { in: 'assets/css/fonts.css', out: 'assets/css/fonts.min.css' },
  { in: 'assets/css/style.css', out: 'assets/css/style.min.css' },
  { in: 'assets/css/studio-v2.css', out: 'assets/css/studio-v2.min.css' },
  { in: 'assets/css/cover-experience.css', out: 'assets/css/cover-experience.min.css' },
  { in: 'assets/js/script.js', out: 'assets/js/script.min.js' },
  { in: 'assets/js/validate.js', out: 'assets/js/validate.min.js' },
  { in: 'assets/js/forms.js', out: 'assets/js/forms.min.js' },
  { in: 'assets/js/a11y.js', out: 'assets/js/a11y.min.js' },
  { in: 'assets/js/i18n.js', out: 'assets/js/i18n.min.js' },
  { in: 'assets/js/instagram.js', out: 'assets/js/instagram.min.js' },
  { in: 'assets/js/ig-config.js', out: 'assets/js/ig-config.min.js' },
  { in: 'assets/js/lightbox.js', out: 'assets/js/lightbox.min.js' },
  { in: 'assets/js/cookie-consent.js', out: 'assets/js/cookie-consent.min.js' },
  { in: 'assets/js/cover-experience.js', out: 'assets/js/cover-experience.min.js' },
  { in: 'assets/js/motion.js', out: 'assets/js/motion.min.js' },
  { in: 'assets/js/studio-v2.js', out: 'assets/js/studio-v2.min.js' },
];

/** Cache-busting token appended to every asset URL in the HTML.
 *  vercel.json serves /assets/* as immutable for a year, so this MUST be bumped
 *  whenever a bundled file changes or returning visitors keep the stale copy. */
export const ASSET_VERSION = 13;
