# Design system — Studio Cover Design

The locked system for studiocoverdesign.com. Written after the site went through
four complete visual directions with no record of which one was current.

**Read this before changing any visual code.** Every page shares this system —
they are not independently themed. `scripts/check-design-system.mjs` enforces the
parts that are machine-checkable; this file carries the parts that aren't.

---

## What this is

A studio that designs album and single covers for Israeli musicians, produces
music videos, and handles digital distribution. Hebrew-first, RTL, bilingual
HE/EN. Static HTML, no framework, hand-rolled esbuild pipeline.

**Genre:** editorial. Typography-led, image-dense, quiet chrome.
**Tone:** warm, professional, not precious. The work is loud; the page is not.

---

## Colour

Light ground, warm. Never pure white as a surface — a `#FFFFFF` card on a tinted
ground reads as a hole punched in the page rather than as paper laid on it.

| Token | Value | Job |
| --- | --- | --- |
| `--bg` | `#F2EFE9` | the ground |
| `--bg-deep` | `#141114` | the dark plate: showreel band, footer, veil, loader |
| `--brown` | `#453027` | warm atmosphere under the dark plate; a tint, never a fill |
| `--orange` | `#FF6D29` | the one saturated colour. **A fill, not an ink.** |
| `--orange-ink` | `#B04609` | the same hue, dark enough to be read as text |
| `--gray` | `#5A5450` | secondary text |
| `--white` | `#FFFFFF` | type *on* the dark plate only |
| `--surface-3` | `#FCFAF6` | cards — tinted, not white |

**The orange rule.** `--orange` measures 2.6:1 on the ground: it fills shapes and
dark ink rides on top of it. Anywhere orange has to be *read* — a link, a rule, a
label — it is `--orange-ink` at 4.9:1. The primary CTA is `--text` on `--orange`
(6.2:1), never white on orange (2.8:1, fails at any size).

Measured floors, all AA: body 15.2:1 · secondary 6.5:1 · small print 4.8:1 ·
error 5.7:1 · white on the dark plate 18.8:1. A control's border owes 3:1 as a UI
component — decorative card hairlines do not.

---

## Type

**Two families, and that is deliberate.** The client supplied Google Sans and
asked that it not be replaced; Karantina was already licensed for the logotype.

| Role | Face | Where |
| --- | --- | --- |
| Logotype + section titles | **Karantina** Bold | `.intro-word`, `.section-title` |
| Display | **Google Sans** (x-height 510) | `h1`, `h2`, buttons, numerals |
| Text | **Google Sans 17pt** (x-height 526) | body, UI, labels, forms |

The two Google Sans cuts are real optical sizes, not a duplicate: same 716 cap
height, different x-height. Display above ~24px, text everywhere else.

**Weights: 400 / 500 / 600 / 700 — and only those.** Verified against the OS/2
tables of every file in `/font`. There is no Light, no ExtraBold, no Black. A rule
that asks for 300 or 800 gets silently rounded and the hierarchy becomes a
fiction; the design check fails the build on it.

**Tracking is size-specific.** `--ls-display` (−.015em) for 27–40px headings,
`--ls-hero` (−.03em) for the 42–144px wordmark, `--ls-tracked` (.18em) for
micro-labels at `--t-xs`. One value across the range is wrong somewhere.

`text-transform: uppercase` is safe on labels — Hebrew has no case mapping, so it
only ever touches Latin runs (VFX, VJ, AI).

---

## Layout

**The page is start-aligned.** Copy hangs on the start edge — the right, in
Hebrew — because that is where the eye already begins. The intro band is the one
exception: a centred logotype is a logotype. That single exception is what makes
the bias read as chosen rather than absent.

Do not re-centre `.section`, `.section-head`, `.cta-row` or `.load-more`. That
was the site's most templated property and one declaration restored it.

**Spacing:** `--s-2`…`--s-10`, a 4px scale, for layout rhythm. `--c-1`…`--c-6`
for distances *inside* a control. Do not mix them — the component scale tops out
below a single section's padding and cannot express page rhythm.

**Radius:** `--r-xs` 10 · `--r-sm` 14 · `--r-md` 22 · `--r-lg` pill. Pill is for
things that are genuinely round: the social discs, the WhatsApp button, the
scroll-cue mouse, buttons.

**Grids describe their real content.** `repeat(4,1fr)` on a grid that receives
two children is a lie that renders. Use `auto-fit` + `minmax(min(260px,100%),1fr)`
when the count varies.

---

## Components

**Nav — edge-aligned.** Links hang on the start edge, language switch on the end
edge. Not a centred pill: a centred inline-link bar is genre-blind and lands
identically on a B2B SaaS.

**Footer — statement close, not a link index.** One line of what the studio does,
the phone and the address at reading size, socials, then a single quiet rule
carrying everything else. It is **not** four columns of links with a social row
and a copyright tail; that shape was removed on purpose and the design check now
fails the build if a legal link goes missing from it.

**Sequences are sequences.** Ordered steps run as one ruled column with the
number inline beside its heading — not as a row of equal tiles with a badge
stacked above a heading above two lines of body. That shape fights the ordering
it is trying to express.

**Cards** are flat, hairline-bordered, tinted, with a soft short shadow. No
side-stripes: an asymmetric thick coloured border on one edge is a 2018-SaaS
tell. No card inside a card.

**Icons — two tiers, applied without exception.** `.icon-ui` is Lucide, stroked
at `--icon-stroke` 1.75, never filled. `.icon-brand` is Simple Icons, solid,
never stroked. Lucide has no brand marks and never will; forcing a logo into a
stroke tier misdraws it. Both on a 24 grid, both inheriting `currentColor`.
Generated by `npm run build:icons` — never hand-paste SVG path data.

---

## Motion

One easing language: `--ease` (easeOutExpo), `--ease-out`, `--ease-wipe`. No
fourth curve; the design check fails on a hand-written bezier.

Timing scale `--d-press` .10s … `--d-page` .52s. Reveals are a rise and a fade;
`--d-reveal` .45s with `--stagger` .05s so a full grid lands inside a second.

**Feedback on press, not only on hover.** Every interactive element has a
`:active` state visible *from rest* — a press that only reads as a change from
hover gives a touch user nothing. `@media (hover:none)` resets every sticky
hover: transform, filter, shadow, and the button lift.

Nothing loops. Two infinite animations (a pulsing glow, a colour-cycling
gradient) were removed for being permanent attention-grabbers; the three
marquees are content and stay.

`prefers-reduced-motion` collapses everything. `prefers-contrast: more` and
`prefers-reduced-transparency` make surfaces opaque — **not inverted**; that
block once turned the header white with white type on it.

---

## Forms

Five forms, one system: `api/_lib/validate.js` is the source of truth and
`assets/js/validate.js` is a generated copy the build keeps byte-identical.
Client validation is presentation only — every rule runs again server-side.
Adding a form is one row in the `FORMS` table plus `data-form="id"`. See
`api/README.md`.

---

## What the build enforces

`npm run verify` → lint · types · design check · 101 test assertions · build.

The design check fails on: dead tokens, dead component CSS, px font sizes,
off-system easing, glass stacked on glass, a missing legal link in the footer,
a font weight the family doesn't ship, a remote webfont, a stale validator copy,
an unregistered form, a form without a honeypot, and anything resembling an API
key in browser code.

If a rule in this file isn't in that list, it is on you to hold it.

---

## Known open items

- `index-v2.html` runs its own separate stylesheet — an alternative direction,
  `noindex`, not on this system. Either bring it across or delete it.
- Rate limiting on `/api/contact` is per serverless instance. Upgrade path is
  Vercel KV; the two `Map`s become one store and nothing else changes.
- `RESEND_API_KEY` and `CONTACT_TO` are not set yet, so no form mail is
  delivered. Everything up to the send runs and logs.
