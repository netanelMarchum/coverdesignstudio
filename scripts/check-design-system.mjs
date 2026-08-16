// Design-system guard.
//
// The stylesheet claims one spacing scale, one type scale, one easing language
// and one translucent surface. Every one of those claims had drifted — dead
// tokens nobody could see, px font sizes that opted out of the text-size
// control, a fourth easing curve in one section, glass stacked on glass. These
// are the assertions that catch the drift coming back.
//
// Run: node scripts/check-design-system.mjs   (part of `npm run verify`)

import { readFileSync, readdirSync } from 'node:fs';

// Comments are stripped first: every rule in this file explains itself, so the
// word "backdrop-filter" appears in prose that describes NOT using one, and a
// naive substring search reads the explanation as the violation.
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const css = decomment(readFileSync('assets/css/style.css', 'utf8'));
const cx = decomment(readFileSync('assets/css/cover-experience.css', 'utf8'));
// Tokens are also read from the scripts: the cookie banner styles itself from
// the same ladder, so --z-consent has exactly one user and it is not in a sheet.
const js = readdirSync('assets/js')
  .filter((f) => f.endsWith('.js') && !f.endsWith('.min.js'))
  .map((f) => decomment(readFileSync(`assets/js/${f}`, 'utf8')))
  .join('\n');
const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
const fails = [];

function check(name, ok, detail) {
  if (!ok) fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

// Every token that is declared is used. A token nobody references is a design
// decision that exists only in the comment above it.
const declared = [...new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))];
const all = css + cx + js;
const dead = declared.filter((t) => !all.includes(`var(${t})`) && !all.includes(`var(${t},`));
check('dead tokens', dead.length === 0, dead.join(' '));

// Dead components. The token check above catches a colour nobody references;
// it did not catch ~100 lines of .svc-* and .strategy-* CSS left behind when
// two homepage sections were deleted. A class that no page contains is a
// component that no longer exists, and it will be styled forever by accident.
//
// Only top-level component classes are checked — modifiers, states and
// utilities legitimately have no markup of their own.
const markup = pages.map((p) => readFileSync(p, 'utf8')).join('\n') + js;
const UTILITY = /^(is-|has-|js-|a11y-|sr-|icon|grain|reveal|section|container|btn|hp|field|form|skip|page-veil|loaded|hdr-over|cx-)/;
const classes = [...new Set(
  [...css.matchAll(/^\.([a-z][a-z0-9-]{3,})(?=[\s,{:.])/gm)].map((m) => m[1]),
)].filter((c) => !UTILITY.test(c));
const orphans = classes.filter((c) => !new RegExp(`["'\\s]${c}[\\s"']|["'\\s]${c}$`, 'm').test(markup));
check('dead component CSS', orphans.length === 0, orphans.join(' '));

// The inverse, and the one that actually mattered: markup with NO styling.
// The check above catches CSS nothing uses. It did not catch the opposite —
// the entire .video-grid / .video-card block was deleted as "dead" while both
// the homepage and the video page were still rendering it, and the clips shipped
// as unstyled blocks. A rule can be removed by accident; a class in the markup
// is evidence that something was supposed to style it.
const HOOKS = new Set(['lang-en', 'intro-scroll-label']);   // i18n + JS only, never styled
const inMarkup = new Set();
for (const p of pages) {
  if (p === 'index-v2.html') continue;   // its own stylesheet
  for (const m of readFileSync(p, 'utf8').matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) inMarkup.add(c);
  }
}
const unstyled = [...inMarkup].filter((c) => !HOOKS.has(c) && !css.includes('.' + c) && !cx.includes('.' + c));
check('markup with no styling', unstyled.length === 0, unstyled.join(' '));

// Type is set in rem so the accessibility toolbar's text-size steps reach it.
const pxType = [...css.matchAll(/font-size:\s*[\d.]+px/g)].map((m) => m[0]);
check('px font sizes', pxType.length === 0, pxType.join(' '));

// One easing language: the three named curves, never a hand-written bezier.
const beziers = [...(css + cx).matchAll(/cubic-bezier\([^)]*\)/g)].map((m) => m[0]);
const allowed = new Set(['cubic-bezier(.16,1,.3,1)', 'cubic-bezier(.22,.61,.36,1)', 'cubic-bezier(.62,.04,.36,1)']);
const stray = beziers.filter((b) => !allowed.has(b.replace(/\s/g, '')));
check('off-system easing', stray.length === 0, stray.join(' '));

// One translucent surface. A backdrop-filter inside the header would also make
// it the containing block for the fixed mobile drawer, which collapses it.
const navBlock = css.slice(css.indexOf('.main-nav{'), css.indexOf('.main-nav ul{'));
check('glass stacked on glass', !navBlock.includes('backdrop-filter'));

// The footer is a statement close now, not a link index, so the thing worth
// guarding is no longer a heading selector but the destinations themselves.
// Dropping a legal link during a redesign is silent, and it is the one kind of
// loss that actually costs something.
const LEGAL = ['privacy.html', 'terms-of-use.html', 'accessibility-statement.html'];
for (const p of pages) {
  if (p === 'index-v2.html') continue;
  const tail = readFileSync(p, 'utf8').match(/<footer[\s\S]*?<\/footer>/);
  check(`${p} has a footer`, !!tail);
  if (tail) for (const l of LEGAL) check(`${p} footer dropped ${l}`, tail[0].includes(l));
}

// Feedback on press, not only on hover: a touch screen has no hover at all.
check('press states', css.includes('.insta-item:active') && css.includes('.btn:active'));
check('touch hover reset', css.includes('@media (hover:none)'));

// ---------------------------------------------------------------------------
// Type. The family is local and static, so both halves of this are checkable:
// which faces exist on disk, and which weights those faces actually contain.
// ---------------------------------------------------------------------------
const faceSheet = decomment(readFileSync('assets/css/fonts.css', 'utf8'));
const faces = [...faceSheet.matchAll(/url\('\.\.\/fonts\/([^']+)'/g)].map((m) => m[1]);
const onDisk = new Set(readdirSync('assets/fonts'));
check('missing font files', faces.every((f) => onDisk.has(f)), faces.filter((f) => !onDisk.has(f)).join(' '));

// The weights the @font-face rules actually declare — the only ones any rule in
// this project is allowed to ask for. Asking for 300 or 800 does not fail
// loudly: the browser rounds to the nearest real face, so a hierarchy of six
// weights renders as four and nobody finds out. This is that alarm.
const shipped = new Set([...faceSheet.matchAll(/font-weight:(\d{3})/g)].map((m) => +m[1]));
const asked = new Set();
for (const [name, sheet] of [['style.css', css], ['studio-v2.css', decomment(readFileSync('assets/css/studio-v2.css', 'utf8'))]]) {
  for (const m of sheet.matchAll(/font-weight:\s*(\d{3})/g)) asked.add(`${name}:${m[1]}`);
  for (const m of sheet.matchAll(/--fw-[a-z]+:\s*(\d{3})/g)) asked.add(`${name}:${m[1]}`);
}
const phantom = [...asked].filter((a) => !shipped.has(+a.split(':')[1]));
check('weights the family does not ship', phantom.length === 0, phantom.join(' '));

// Nothing is fetched from a font CDN: the family is served from this origin.
for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  check(`${p} remote webfont`, !/fonts\.(googleapis|gstatic)\.com/.test(html));
}

// ---------------------------------------------------------------------------
// Forms. The browser copy of the validator must be byte-identical to the
// server's, or the two disagree and the form starts accepting in the UI what
// the endpoint rejects. This is the only thing keeping the copy honest.
// ---------------------------------------------------------------------------
const vSrc = readFileSync('api/_lib/validate.js', 'utf8');
const vWeb = readFileSync('assets/js/validate.js', 'utf8');
check('validator copy is stale', vWeb.endsWith(vSrc), 'run: npm run build:forms');

// Every form in the markup must be one the server knows about, and must carry
// its honeypot.
const FORM_IDS = [...vSrc.matchAll(/^\s{4}([a-z]+):\s*\{ label:/gm)].map((m) => m[1]);
check('no forms registered', FORM_IDS.length > 0);

const SECRET = /re_[A-Za-z0-9_]{16,}|SG\.[A-Za-z0-9_-]{16,}|api[_-]?key\s*[:=]\s*['"][^'"]{12,}/i;

for (const p of pages) {
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/<form[^>]*data-form="([^"]+)"/g)) {
    check(`${p} unknown form id "${m[1]}"`, FORM_IDS.includes(m[1]));
  }
  // Every form is registered, and every form has its honeypot.
  const forms = (html.match(/<form/g) || []).length;
  const registered = (html.match(/<form[^>]*data-form=/g) || []).length;
  const pots = (html.match(/class="hp-field"|class="hp"/g) || []).length;
  check(`${p} unregistered form`, registered >= forms);
  check(`${p} form without a honeypot`, pots >= forms);
  // A key in the markup would be readable by anyone who opens DevTools.
  check(`${p} leaks a secret`, !SECRET.test(html));
}

for (const j of readdirSync('assets/js').filter((x) => x.endsWith('.js'))) {
  check(`assets/js/${j} leaks a secret`, !SECRET.test(readFileSync(`assets/js/${j}`, 'utf8')));
}

if (fails.length) {
  console.error('design-system check FAILED:\n  ' + fails.join('\n  '));
  process.exit(1);
}
console.log(`design-system check ok — ${declared.length} tokens, ${pages.length} pages`);
