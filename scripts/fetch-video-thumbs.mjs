// Downloads the YouTube poster frame for every clip referenced in the HTML and
// stores it locally as WebP.
//
// Why not hotlink img.youtube.com like before:
//   * privacy blockers and some corporate/ISP filters block it, which left the
//     clip grids as empty boxes for those visitors;
//   * it contacted Google on page load, before the cookie banner was answered;
//   * it needed a third-party origin in the CSP img-src.
//
// Re-run after adding clips:  npm run fetch:thumbs
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = 'assets/img/video';
await mkdir(OUT, { recursive: true });

const pages = (await readdir('.')).filter((f) => f.endsWith('.html'));
const ids = new Set();
for (const p of pages) {
  const html = await readFile(p, 'utf8');
  for (const m of html.matchAll(/(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/([\w-]+)\//g)) ids.add(m[1]);
  for (const m of html.matchAll(/assets\/img\/video\/([\w-]+)\.webp/g)) ids.add(m[1]);
}

let ok = 0;
let bytes = 0;
for (const id of ids) {
  // maxresdefault is missing for older uploads; hqdefault always exists.
  let buf = null;
  for (const q of ['maxresdefault', 'hqdefault']) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`);
    if (!res.ok) continue;
    const b = Buffer.from(await res.arrayBuffer());
    // YouTube serves a 120x90 grey placeholder for unavailable videos.
    const meta = await sharp(b).metadata();
    if (meta.width < 320) continue;
    buf = b;
    break;
  }
  if (!buf) {
    console.error(`  ! no thumbnail for ${id} — clip may be private or deleted`);
    continue;
  }
  // Cards render 16:9 at <=460px wide; 640 covers 2x on the largest card.
  const out = await sharp(buf).resize(640, 360, { fit: 'cover' }).webp({ quality: 80, effort: 6 }).toBuffer();
  await writeFile(`${OUT}/${id}.webp`, out);
  ok++;
  bytes += out.length;
  console.log(`  ${id}  ${Math.round(out.length / 1024)}KB`);
}
console.log(`\n${ok}/${ids.size} thumbnails saved to ${OUT} (${Math.round(bytes / 1024)}KB total).`);
