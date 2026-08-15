// Rewrites the static gallery markup from the live feed.
//
// The galleries are populated by assets/js/instagram.js at runtime, but the
// HTML still carries a copy so the page works without JS and while the feed
// request is in flight. That copy used to be maintained by hand — it drifted
// until the captions described one set of covers and the <img> files showed a
// completely different (third-party) set. Generating it from the same feed the
// JS uses removes that whole failure mode.
import { readFile, writeFile } from 'node:fs/promises';

const GRID_PAGES = ['index.html', 'graphics.html'];
const REEL_PAGES = ['index.html'];
const GRID_COUNT = 8;   // matches GRID_START in assets/js/instagram.js
const REEL_COUNT = 8;   // hero marquee, rendered twice so the loop is seamless

const esc = (s) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace the inner HTML of the first element carrying `marker`. */
function replaceBlock(html, marker, inner) {
  const open = html.indexOf(marker);
  if (open === -1) return null;
  const start = html.indexOf('>', open) + 1;
  // The blocks contain only <a>/<img> children, so a depth scan on <div is enough.
  let depth = 1;
  let i = start;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
    else { depth--; i = nextClose + 6; }
  }
  const end = i - 6;
  return html.slice(0, start) + inner + html.slice(end);
}

export async function syncStaticGallery(items) {
  if (!items.length) return;

  const gridInner =
    '\n' +
    items.slice(0, GRID_COUNT).map((m) => {
      const cap = esc(m.caption);
      return `      <a class="insta-item" href="${esc(m.link)}" target="_blank" rel="noopener"><img src="${esc(m.image)}" alt="${cap}" loading="lazy" decoding="async" width="800" height="800">\n` +
             `        <div class="cap">${cap}</div>\n      </a>`;
    }).join('\n') +
    '\n    ';

  const reelSet = items.slice(0, REEL_COUNT);
  const reelInner =
    '\n' +
    reelSet.concat(reelSet).map((m, i) => {
      const thumb = m.image.replace(/\/insta\/(i\d+)\.jpg$/, '/insta/thumb/$1.webp');
      const prio = i < 2 ? 'fetchpriority="high"' : 'loading="lazy"';
      return `      <img src="${esc(thumb)}" alt="" width="400" height="400" decoding="async" ${prio}>`;
    }).join('\n') +
    '\n    ';

  for (const page of new Set([...GRID_PAGES, ...REEL_PAGES])) {
    let html;
    try { html = await readFile(page, 'utf8'); } catch { continue; }
    const before = html;

    if (GRID_PAGES.includes(page)) {
      const next = replaceBlock(html, '<div class="insta-grid', gridInner);
      if (next) html = next; else console.error(`  ! ${page}: .insta-grid block not found`);
    }
    if (REEL_PAGES.includes(page)) {
      const next = replaceBlock(html, '<div class="hero-reel-track', reelInner);
      if (next) html = next; else console.error(`  ! ${page}: .hero-reel-track block not found`);
    }

    if (html !== before) {
      await writeFile(page, html, 'utf8');
      console.log(`  synced static gallery in ${page}`);
    }
  }
}
