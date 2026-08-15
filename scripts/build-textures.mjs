// Bakes the web-sized film texture assets from the raw 8K/4K source packs.
//
// The sources (Film-Grain-Textures-FREE-Pack-8K, Film-Dust-Textures) are 14-37 MB
// stills that are NOT in this repo — their licence permits modifying them and
// embedding the result in a work, but not redistributing the originals. Keep the
// folders out of git; this script is the record of exactly what was derived from
// them, and the one place to retune the texture.
//
// Usage: node scripts/build-textures.mjs [--sources <dir>]
//
// ---------------------------------------------------------------------------
// Why the numbers below are what they are
//
// A blended full-screen layer does two things at once: it adds VARIATION (the
// grain you want to see) and it SHIFTS the average luminance (the muddy-grey
// wash you don't). Those are the standard deviation and the mean of the tile.
//
//   screen   over a dark surface: lift  = opacity * mean/255
//   multiply over a light surface: darkening = opacity * (255-mean)/255
//
// So each tile is stretched to put its MEAN at the blend-neutral end (0 for
// screen, 255 for multiply) while pushing its SD as high as the source allows.
// That is what lets the overlay run at a high CSS opacity — where the grain is
// genuinely visible — while moving flat white or flat black only ~3 levels.
// A mid-grey noise tile cannot do this: its mean is 128, so it greys everything.
//
// Blend polarity is why two different source textures are used rather than one:
// pack textures 1-6 are light grain on black (mean ~16-29, the screen tile) and
// 7-10 are dark grain on white (mean ~214-243, the multiply tile). Texture 2 and
// texture 10 are the two finest, most even fields of their respective polarity —
// 3 is nearly featureless, and 7/8/9 are coarse reticulated patterns that read
// as a texture rather than as grain.
// ---------------------------------------------------------------------------

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const SOURCES = argv[argv.indexOf('--sources') + 1] ?? '.';
const OUT = 'assets/img/texture';

const GRAIN_DIR = join(SOURCES, 'Film-Grain-Textures-FREE-Pack-8K/Film-Grain-Textures-FREE-Pack-8K');
const DUST_DIR = join(SOURCES, 'Film-Dust-Textures/Film Dust Textures');

/** Mean/SD of an 8-bit single-channel buffer. */
function stats(buf) {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
    sumSq += buf[i] * buf[i];
  }
  const mean = sum / buf.length;
  return { mean, sd: Math.sqrt(sumSq / buf.length - mean * mean) };
}

/** out = clamp(gain * (in - 128) + offset), solved so the CLIPPED result lands
 *  on the requested mean/sd. Clipping is the whole point (it crushes the empty
 *  field to pure neutral and keeps only the particles), but it also pulls the
 *  mean back, so the offset is refined against a real measurement. */
function stretch(src, { mean: targetMean, sd: targetSd }) {
  const s = stats(src);
  const gain = targetSd / s.sd;
  let offset = targetMean;
  let out = src;

  for (let pass = 0; pass < 12; pass++) {
    out = Buffer.allocUnsafe(src.length);
    for (let i = 0; i < src.length; i++) {
      const v = gain * (src[i] - s.mean) + offset;
      out[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    const got = stats(out);
    if (Math.abs(got.mean - targetMean) < 0.15) break;
    offset += targetMean - got.mean;
  }
  return out;
}

/** Strips large-scale luminance variation (vignetting, blotches, uneven
 *  illumination) by subtracting a heavy blur. This is what makes a plain crop
 *  tile invisibly: the eye spots a repeat by its structure, and after a
 *  high-pass there is no structure left — only uncorrelated particle noise,
 *  which has no alignable features across a seam. */
async function highPass(raw, w, h, sigma = 24) {
  const blurred = await sharp(raw, { raw: { width: w, height: h, channels: 1 } })
    .blur(sigma).raw().toBuffer();
  const out = Buffer.allocUnsafe(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i] - blurred[i] + 128;
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return out;
}

/** One 512px grain tile, cropped at NATIVE resolution — resizing an 8K frame
 *  down would average the grain into mush and we would end up shipping a blur.
 *  Displayed at 256 CSS px (see film grain block in style.css), so it is
 *  pixel-exact on 2x displays. */
async function grainTile(file, out, target) {
  const SIZE = 512;
  const src = join(GRAIN_DIR, file);
  const { width, height } = await sharp(src).metadata();
  const raw = await sharp(src)
    // centre crop: the edges of these scans carry the heaviest vignetting
    .extract({
      left: Math.round(width / 2 - SIZE / 2),
      top: Math.round(height / 2 - SIZE / 2),
      width: SIZE, height: SIZE,
    })
    .greyscale().raw().toBuffer();

  const tile = stretch(await highPass(raw, SIZE, SIZE), target);

  // Quality 60 on pure noise: compression artefacts in a random field are
  // themselves a random field, and at 4% effective contrast they are invisible.
  // q90 triples the bytes for a difference nobody can see.
  await sharp(tile, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .webp({ quality: 60, effort: 6 }).toFile(join(OUT, out));

  const got = stats(tile);
  console.log(`${out.padEnd(22)} from ${file}  mean=${got.mean.toFixed(1)} sd=${got.sd.toFixed(1)}`);
  return got;
}

/** The dust frame. Not tiled — it is a whole-frame image of sparse specks and
 *  the odd hair, used with background-size:cover so no speck ever repeats.
 *  Kept dark-mean so it only ever ADDS the specks under `screen`. */
async function dustFrame(file, out, target) {
  const W = 1800;
  const raw = await sharp(join(DUST_DIR, file))
    .greyscale()
    .resize({ width: W, kernel: 'lanczos3' })
    .raw().toBuffer({ resolveWithObject: true });

  const frame = stretch(raw.data, target);
  await sharp(frame, { raw: { width: raw.info.width, height: raw.info.height, channels: 1 } })
    .webp({ quality: 72, effort: 6 }).toFile(join(OUT, out));

  const got = stats(frame);
  console.log(`${out.padEnd(22)} from ${file}  mean=${got.mean.toFixed(1)} sd=${got.sd.toFixed(1)} (${raw.info.width}x${raw.info.height})`);
  return got;
}

await mkdir(OUT, { recursive: true });

// Symmetric targets: both grain tiles sit 15 levels off their neutral end with
// the same SD, so the light and dark halves of the site receive an identical
// amount of texture from a single opacity value.
const GRAIN_SD = 26;
const dark = await grainTile('AU-FG-Texture2-8K.jpg', 'film-grain-dark.webp', { mean: 15, sd: GRAIN_SD });
const light = await grainTile('AU-FG-Texture10-8K.jpg', 'film-grain-light.webp', { mean: 240, sd: GRAIN_SD });
// Dust is sparse by nature; a low mean keeps the empty 99% of the frame at pure
// black so `screen` adds nothing there, and only the specks register.
const dust = await dustFrame('25.jpg', 'film-dust.webp', { mean: 3, sd: 15 });

// --- self-check: these two properties are the entire design. If a retune
// breaks them the overlay either stops being visible or starts greying the page.
const assert = (ok, msg) => { if (!ok) { console.error(`FAIL: ${msg}`); process.exitCode = 1; } };
assert(dark.mean < 20, `screen tile must stay near black or it lifts blacks (mean ${dark.mean.toFixed(1)})`);
assert(light.mean > 235, `multiply tile must stay near white or it greys whites (mean ${light.mean.toFixed(1)})`);
assert(dark.sd > 18 && light.sd > 18, 'grain tiles need SD > 18 to be visible at these opacities');
assert(dust.mean < 8, `dust frame must stay near black (mean ${dust.mean.toFixed(1)})`);
if (!process.exitCode) console.log('\nself-check passed');
