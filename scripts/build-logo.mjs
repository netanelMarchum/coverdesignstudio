// Turns the supplied logo artwork into a web asset.
//
// The source (logo full v4.png) is 3631×3630 with an OPAQUE near-black
// background, and the mark itself occupies only the middle ~37%. Dropped into
// the site as-is it would paint a large black square inside a white nav pill.
//
// So: crop to the mark, and derive an alpha channel from the artwork's own
// luminance rather than keying out a colour. The source is flat orange on flat
// black, so luminance maps cleanly onto coverage — and doing it that way keeps
// the anti-aliased edge instead of producing the jagged outline a hard colour
// key gives you.
//
// Run: npm run build:logo

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'logo full v4.png';
const OUT = 'assets/img/logo-mark-v4.webp';
const SIZE = 256;          // 2x the largest place it is used
const PAD = 0.06;          // a little air around the mark

const src = sharp(SRC).ensureAlpha();
const meta = await src.metadata();

// 1 · find the mark
const probe = await sharp(SRC).resize(400).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
for (let y = 0; y < probe.info.height; y++) {
  for (let x = 0; x < probe.info.width; x++) {
    const i = (y * probe.info.width + x) * probe.info.channels;
    if (probe.data[i] > 120 && probe.data[i + 1] > 70 && probe.data[i + 2] < 120) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
const s = meta.width / probe.info.width;
const pad = (maxX - minX) * s * PAD;
const left = Math.max(0, Math.round(minX * s - pad));
const top = Math.max(0, Math.round(minY * s - pad));
const width = Math.min(meta.width - left, Math.round((maxX - minX) * s + pad * 2));
const height = Math.min(meta.height - top, Math.round((maxY - minY) * s + pad * 2));

// 2 · crop, scale, and rebuild the alpha from luminance
const { data, info } = await sharp(SRC)
  .extract({ left, top, width, height })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 8, g: 8, b: 8, alpha: 1 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// The two ends of the ramp, measured off the artwork rather than assumed.
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
let lo = 255, hi = 0, or = 0, og = 0, ob = 0, n = 0;
for (let i = 0; i < data.length; i += info.channels) {
  const l = lum(data[i], data[i + 1], data[i + 2]);
  if (l < lo) lo = l;
  if (l > hi) { hi = l; }
  if (data[i] > 150 && data[i + 2] < 120) { or += data[i]; og += data[i + 1]; ob += data[i + 2]; n++; }
}
const ink = { r: Math.round(or / n), g: Math.round(og / n), b: Math.round(ob / n) };

const out = Buffer.alloc(SIZE * SIZE * 4);
for (let p = 0; p < SIZE * SIZE; p++) {
  const i = p * info.channels;
  const a = Math.max(0, Math.min(1, (lum(data[i], data[i + 1], data[i + 2]) - lo) / (hi - lo)));
  out[p * 4] = ink.r; out[p * 4 + 1] = ink.g; out[p * 4 + 2] = ink.b;
  out[p * 4 + 3] = Math.round(a * 255);
}

const buf = await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toBuffer();
await writeFile(OUT, buf);

console.log(`${OUT}  ${SIZE}x${SIZE}  ${(buf.length / 1024).toFixed(1)}K`);
console.log(`  cropped from ${meta.width}x${meta.height} at ${left},${top} ${width}x${height}`);
console.log(`  mark colour rgb(${ink.r},${ink.g},${ink.b}) on transparency`);
