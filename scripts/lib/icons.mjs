// The icon system, sourced from two libraries on purpose.
//
// Lucide is the primary set, and every UI icon comes from it. It has no brand
// marks — they were removed from the project years ago — so the five social and
// messaging logos come from Simple Icons, which is where they actually live.
//
// That split is also why this file has two tiers rather than one. A brand mark
// is a solid shape whose outline IS the logo; a Lucide icon is a 24×24 stroke
// drawing. Forcing either into the other's style would misdraw it. So the rule
// is not "one style everywhere" but "one style per tier, applied without
// exception": brand marks solid in currentColor, UI icons stroked at a single
// weight, both on the same 24 grid and the same optical sizes.
//
// Nothing here is hand-drawn. Geometry is read out of the installed packages.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const simpleIcons = require('simple-icons');

/** Pull the drawing out of a Lucide file, dropping its own presentation attrs
 *  — stroke width and colour are set once in CSS so every icon shares them. */
function lucide(name) {
  const file = readFileSync(`node_modules/lucide-static/icons/${name}.svg`, 'utf8');
  const inner = file.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return inner.replace(/\s+/g, ' ').trim();
}

function brand(key) {
  const i = simpleIcons[key];
  if (!i) throw new Error(`simple-icons has no ${key}`);
  return `<path d="${i.path}"/>`;
}

// name → [tier, geometry]. Every entry is a deliberate semantic match:
// what the control does, not what it looks like.
const ICONS = {
  // UI — Lucide
  accessibility: ['ui', () => lucide('accessibility')],
  menu:          ['ui', () => lucide('menu')],
  close:         ['ui', () => lucide('x')],
  'volume-off':  ['ui', () => lucide('volume-x')],
  'volume-on':   ['ui', () => lucide('volume-2')],
  check:         ['ui', () => lucide('check')],
  'arrow-left':  ['ui', () => lucide('arrow-left')],
  'arrow-up-right': ['ui', () => lucide('arrow-up-right')],

  // Brand — Simple Icons
  pinterest: ['brand', () => brand('siPinterest')],
  instagram: ['brand', () => brand('siInstagram')],
  tiktok:    ['brand', () => brand('siTiktok')],
  youtube:   ['brand', () => brand('siYoutube')],
  whatsapp:  ['brand', () => brand('siWhatsapp')],
};

const cache = new Map();

/** Inline <svg> for a page. Always decorative: every one of these sits inside a
 *  control that already carries its own aria-label, so announcing the icon too
 *  would read the same thing twice. */
export function icon(name, extraClass = '') {
  const key = `${name}|${extraClass}`;
  if (cache.has(key)) return cache.get(key);
  const entry = ICONS[name];
  if (!entry) throw new Error(`unknown icon: ${name}`);
  const [tier, get] = entry;
  const cls = ['icon', `icon-${tier}`, extraClass].filter(Boolean).join(' ');
  const svg = `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${get()}</svg>`;
  cache.set(key, svg);
  return svg;
}

/** Same geometry as a CSS mask, for the two icons that live in `content:`
 *  pseudo-elements. Encoded as a mask rather than a background so the colour
 *  still comes from a design token instead of being baked into the URL. */
export function iconMask(name) {
  const [tier, get] = ICONS[name];
  const attrs = tier === 'ui'
    ? 'fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="black"';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs}>${get()}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const names = Object.keys(ICONS);
