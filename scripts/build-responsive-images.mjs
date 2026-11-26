// Emit responsive WebP assets during the build and preserve the original artwork.
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';

const groups = [
  {
    dir: 'assets/img/insta',
    pattern: /^i\d+\.jpg$/,
    widths: [240, 320, 400, 640, 800],
    quality: 82,
  },
  {
    dir: 'assets/img/portfolio',
    pattern: /^hq[1-8]\.jpg$/,
    widths: [640, 960, 1600],
    quality: 82,
  },
  {
    dir: 'assets/img/fx',
    pattern: /^wave\.webp$/,
    widths: [480],
    quality: 80,
  },
];

for (const { dir, pattern, widths, quality } of groups) {
  await mkdir(`${dir}/responsive`, { recursive: true });
  const files = (await readdir(dir)).filter((file) => pattern.test(file));
  for (const file of files) {
    const source = `${dir}/${file}`;
    const basename = file.slice(0, file.lastIndexOf('.'));
    await Promise.all(widths.map((width) =>
      sharp(source).resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(`${dir}/responsive/${basename}-${width}.webp`),
    ));
  }
  console.log(`Generated ${files.length * widths.length} WebP variants for ${dir}`);
}
