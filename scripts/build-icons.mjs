// Writes the icon set into every page.
//
// The six icons on this site were inlined by hand into nine files — forty-six
// copies of six drawings — so fixing one meant editing nine. They are generated
// from the installed packages now and stamped in from here.
//
// Idempotent: it matches the control by its aria-label or class and replaces
// whatever is inside, so running it again after an icon changes is the update
// path. Run: npm run build:icons

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { icon, iconMask } from './lib/icons.mjs';

// aria-label on the control → which icon belongs in it. The labels are the
// site's own, and they are what makes the match semantic rather than positional.
const BY_LABEL = {
  Pinterest: 'pinterest',
  Instagram: 'instagram',
  TikTok: 'tiktok',
  YouTube: 'youtube',
  WhatsApp: 'whatsapp',
  'נגישות': 'accessibility',
  'תפריט': 'menu',
  'סגירה': 'close',
};

const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
let swapped = 0;
let touched = 0;

for (const page of pages) {
  let s = readFileSync(page, 'utf8');
  const before = s;

  // 1. Controls that already hold an <svg> — replace the drawing, keep the control.
  for (const [label, name] of Object.entries(BY_LABEL)) {
    const re = new RegExp(`(aria-label="${label}"[^>]*>)\\s*<svg[\\s\\S]*?</svg>`, 'g');
    s = s.replace(re, (_, open) => { swapped++; return open + icon(name); });
  }

  // 2. Controls whose "icon" was a text glyph. The label stays on the button;
  //    only the glyph is replaced, so the accessible name does not change.
  s = s.replace(/(<button[^>]*class="burger"[^>]*>)☰(<\/button>)/g,
    (_, a, b) => { swapped++; return a + icon('menu') + b; });
  s = s.replace(/(<button[^>]*class="a11y-close"[^>]*>)×(<\/button>)/g,
    (_, a, b) => { swapped++; return a + icon('close') + b; });

  // 3. The mute toggle carried an emoji, which renders in full colour, differs
  //    on every platform and ignores currentColor. Both states ship as markup
  //    now and CSS shows one — the script only flips an attribute.
  s = s.replace(/(<button class="reel-sound" type="button" aria-label=")[^"]*("[^>]*)>(?:🔇|🔊)?<\/button>/g,
    (_, a, b) => {
      swapped++;
      return `${a}הפעלת סאונד${b} data-muted="true">${icon('volume-off', 'i-off')}${icon('volume-on', 'i-on')}</button>`;
    });

  if (s !== before) { writeFileSync(page, s); touched++; }
}

// 4. The two icons that cannot be markup, because they live inside a
//    content: pseudo-element. Same Lucide geometry, written into the
//    stylesheet as masks so their colour still comes from a token.
const CSS = 'assets/css/style.css';
let css = readFileSync(CSS, 'utf8');
const masks = { '--icon-check': 'check', '--icon-arrow-left': 'arrow-left' };
for (const [prop, name] of Object.entries(masks)) {
  const re = new RegExp(`(  ${prop}:)[^;]*;`);
  if (!re.test(css)) throw new Error(`${CSS} has no ${prop} slot`);
  css = css.replace(re, `$1${iconMask(name)};`);
}
writeFileSync(CSS, css);

console.log(`icons: ${swapped} replaced across ${touched} pages, ${Object.keys(masks).length} masks written`);
