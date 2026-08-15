// Refreshes assets/data/instagram.json using ONLY the Composio connection.
// It calls the Composio platform (via @composio/core) which executes the Instagram
// tool through your existing "cover_design.studio" connection.
// → No Instagram token, no direct Instagram API call. The only CI credential is a
//   Composio API key (COMPOSIO_API_KEY) — a Composio credential, not an Instagram one.
//
// Local run:  COMPOSIO_API_KEY=xxxx node scripts/fetch-instagram.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { Composio } from '@composio/core';
import { syncStaticGallery } from './lib/sync-gallery.mjs';

const apiKey = process.env.COMPOSIO_API_KEY;
if (!apiKey) {
  console.error('Missing COMPOSIO_API_KEY — aborting without touching the feed.');
  process.exit(1);
}

const userId = process.env.COMPOSIO_USER_ID || 'default';
const connectedAccountId = process.env.COMPOSIO_ACCOUNT_ID || undefined; // optional; set if you have >1 IG connection
const LIMIT = Number(process.env.IG_LIMIT || 24);
const OUT = 'assets/data/instagram.json';

const composio = new Composio({ apiKey });

const res = await composio.tools.execute('INSTAGRAM_GET_IG_USER_MEDIA', {
  userId,
  ...(connectedAccountId ? { connectedAccountId } : {}),
  arguments: {
    ig_user_id: 'me',
    limit: LIMIT,
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
  },
});

if (res && res.successful === false) {
  console.error('Composio execution failed:', JSON.stringify(res.error));
  process.exit(1);
}

// Composio returns the Instagram Graph payload under res.data (media array at res.data.data).
const payload = res.data || {};
const raw = payload.data || payload.items || (Array.isArray(payload) ? payload : []);

const remote = raw
  .map((m) => {
    const image = m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url;
    // Captions run several lines then a "-\n-\n-\n#hashtags" trailer. Taking
    // only the first line truncated titles mid-sentence ("…של"), so keep every
    // line up to the trailer and collapse them into one.
    const caption = String(m.caption || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && l !== '-' && !l.startsWith('#'))
      .join(' ')
      .replace(/\s*מבית עיצוב עטיפה סטודיו\s*$/, '')   // implied on our own site
      .replace(/\s+/g, ' ')
      .trim();
    return image ? { caption, image, link: m.permalink } : null;
  })
  .filter(Boolean);

if (!remote.length) {
  console.error('No media returned — keeping the existing feed.');
  process.exit(1);
}

// Download every image and reference the local copy.
//
// Instagram's scontent-*.cdninstagram.com URLs are signed and expire within days.
// Writing them straight into the feed meant the whole gallery turned into alt text
// as soon as the signatures lapsed (every image was returning 403). Self-hosting
// also matches what this site claims to do — no third-party runtime dependency —
// and lets the immutable cache headers in vercel.json actually apply.
//
// Images are resized to 800px: the gallery renders them at ~310px wide at most,
// so anything larger is wasted bytes even on a 2x display.
const IMG_DIR = 'assets/img/insta';
const THUMB_DIR = `${IMG_DIR}/thumb`;
mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

// The homepage hero marquee shows the first 8 covers at <=188px CSS wide, so it
// gets its own 400px WebP set. Regenerating them here keeps the marquee in sync
// with the live feed instead of drifting into a stale hand-picked selection.
const THUMB_COUNT = 8;

const items = [];
const seen = new Set();
for (const post of remote) {
  if (seen.has(post.image)) continue;   // never publish the same cover twice
  seen.add(post.image);
  const i = items.length;
  const dest = `${IMG_DIR}/i${i + 1}.jpg`;
  try {
    const res = await fetch(post.image);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, await sharp(buf)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer());
    if (i < THUMB_COUNT) {
      writeFileSync(`${THUMB_DIR}/i${i + 1}.webp`, await sharp(buf)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 78, effort: 6 })
        .toBuffer());
    }
    items.push({ caption: post.caption, image: dest, link: post.link });
  } catch (err) {
    // Skip this post rather than write a URL that will 403 later.
    console.error(`  ! skipped post: ${err.message}`);
  }
}

if (!items.length) {
  console.error('Every image failed to download — keeping the existing feed.');
  process.exit(1);
}

mkdirSync('assets/data', { recursive: true });
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), account: 'cover_design.studio', source: 'composio', items }, null, 2) + '\n');
console.log(`Wrote ${items.length} items to ${OUT} (images self-hosted in ${IMG_DIR}).`);

// Keep the no-JS fallback markup identical to the feed it mirrors.
await syncStaticGallery(items);
