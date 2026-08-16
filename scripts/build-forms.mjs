// Copies the validator to the browser.
//
// api/_lib/validate.js is the source of truth and runs on the server. The
// browser needs the identical rules so errors appear instantly, and the only
// safe way to have "the same rules in two places" is for one of them to be a
// copy nobody edits. This makes that copy; check-design-system.mjs fails the
// build if they ever differ.
//
// Run: npm run build:forms (chained into `npm run build`)

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'api/_lib/validate.js';
const OUT = 'assets/js/validate.js';

const banner =
  '/* GENERATED FILE — do not edit.\n' +
  '   Copied verbatim from api/_lib/validate.js by scripts/build-forms.mjs so the\n' +
  '   browser and the API validate by exactly the same rules. Edit the source. */\n';

const src = readFileSync(SRC, 'utf8');
writeFileSync(OUT, banner + src);

console.log(`${OUT} ← ${SRC}  (${(src.length / 1024).toFixed(1)}K)`);
