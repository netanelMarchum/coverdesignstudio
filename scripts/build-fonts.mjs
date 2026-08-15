// Turns the source TTFs in /font into web-ready woff2 in assets/fonts.
//
// The sources are ~2 MB each — Latin, Hebrew, Cyrillic, Greek and a full set of
// symbols, sixteen files, 32 MB in total. Shipping that as-is would be more
// than four hundred times the weight of the entire rest of the site. Subset to
// the scripts these pages actually set and compressed to woff2, each face lands
// around 23 KB.
//
// Run: npm run build:fonts   (needs Python + fonttools + brotli, build-time only —
// the browser never sees any of this, and the output is committed)

import { readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SRC = 'font';
const OUT = 'assets/fonts';

// What the site actually sets. Hebrew first, because that is what these pages
// are written in; Latin for the artist names, platform names and the numerals
// in the spec labels; the punctuation block for the quotation marks the cover
// titles use and the directional marks an RTL page needs.
const UNICODES = [
  'U+0020-007E',   // basic Latin
  'U+00A0-00FF',   // Latin-1 supplement
  'U+0590-05FF',   // Hebrew, including niqqud and the maqaf
  'U+FB1D-FB4F',   // Hebrew presentation forms
  'U+2000-206F',   // general punctuation + the bidi control marks
  'U+20AA',        // ₪
  'U+20AC',        // €
  'U+2190-21FF',   // arrows — the process row uses one
  'U+2713',        // ✓ — the requirement lists use one
  'U+25B6',        // ▶
  'U+FEFF',
].join(',');

// mark/mkmk/ccmp are not optional for Hebrew: niqqud and the dagesh are mark
// attachments, and dropping those features leaves vowel points floating.
const FEATURES = 'kern,liga,rlig,calt,mark,mkmk,ccmp,locl,tnum,lnum,onum,frac,ss01';

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.ttf'));
if (!files.length) {
  console.error(`no .ttf found in ${SRC}/`);
  process.exit(1);
}

let before = 0;
let after = 0;
const rows = [];

for (const f of files) {
  const out = `${OUT}/${f.replace(/\.ttf$/i, '.woff2')}`;
  const srcSize = statSync(`${SRC}/${f}`).size;
  try {
    execFileSync('python', [
      '-m', 'fontTools.subset', `${SRC}/${f}`,
      `--unicodes=${UNICODES}`,
      `--layout-features=${FEATURES}`,
      '--flavor=woff2',
      '--desubroutinize',
      `--output-file=${out}`,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    console.error(`✗ ${f}\n${e.stderr ? e.stderr.toString() : e.message}`);
    process.exit(1);
  }
  const outSize = existsSync(out) ? statSync(out).size : 0;
  before += srcSize;
  after += outSize;
  rows.push([f, srcSize, outSize]);
}

const kb = (n) => (n / 1024).toFixed(1).padStart(7) + 'K';
for (const [f, a, b] of rows.sort((x, y) => x[0].localeCompare(y[0]))) {
  console.log(`  ${f.replace(/\.ttf$/, '').padEnd(34)} ${kb(a)} → ${kb(b)}`);
}
console.log(`\n${rows.length} faces  ${(before / 1048576).toFixed(1)}M → ${(after / 1024).toFixed(0)}K`);
