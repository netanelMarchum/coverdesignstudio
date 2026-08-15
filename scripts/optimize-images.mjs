// Re-compresses the JPG/PNG files under assets/img in place.
//
// Format and dimensions are preserved deliberately: the markup references these
// exact paths, so switching to WebP/AVIF would mean rewriting every <img> into a
// <picture> and re-testing the layout. Recompression gets most of the byte
// saving with none of that risk.
//
// Originals are copied to _archive/original-images/ before anything is written,
// because this repo has no version control to fall back on.
//
// Usage: npm run optimize:img -- [--dry]

import { readdir, mkdir, copyFile, stat, writeFile, readFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const SRC = 'assets/img';
const BACKUP = '_archive/original-images';
const DRY = process.argv.includes('--dry');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(jpe?g|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = await walk(SRC);
let before = 0;
let after = 0;
let changed = 0;

for (const file of files) {
  const original = (await stat(file)).size;
  const isPng = /\.png$/i.test(file);

  // Read into memory first: on Windows, handing sharp a path leaves a handle
  // open long enough that the later write-back can fail with UNKNOWN/EBUSY.
  const input = await readFile(file);

  const buf = await sharp(input)
    // PNGs stay lossless — palette quantisation drops them to 256 colours and
    // can band visibly on photographic art. JPEG q85/mozjpeg is a re-encode but
    // is visually transparent at this size.
    .toFormat(isPng ? 'png' : 'jpeg',
      isPng
        ? { compressionLevel: 9, palette: false, effort: 10 }
        : { quality: 85, mozjpeg: true })
    .toBuffer();

  before += original;

  // Only rewrite when the result is a genuine win; recompressing an
  // already-optimised file can easily make it larger.
  if (buf.length < original * 0.98) {
    after += buf.length;
    changed++;
    if (!DRY) {
      const dest = join(BACKUP, relative('.', file));
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(file, dest);
      await writeFile(file, buf);
    }
    console.log(
      `${DRY ? 'would shrink' : 'shrank'} ${file}  ` +
      `${(original / 1024).toFixed(0)}K -> ${(buf.length / 1024).toFixed(0)}K`,
    );
  } else {
    after += original;
  }
}

const saved = before - after;
console.log(
  `\n${changed}/${files.length} files ${DRY ? 'would shrink' : 'shrank'}; ` +
  `${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB ` +
  `(saved ${(saved / 1024 / 1024).toFixed(1)} MB)`,
);
