// Preserve originals; emit two high-quality sizes for square portfolio cards.
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
const dir = 'assets/img/insta';
await mkdir(`${dir}/responsive`, { recursive: true });
let originalBytes = 0, smallBytes = 0, largeBytes = 0;
for (const file of await readdir(dir)) {
  if (!/^i\d+\.jpg$/.test(file)) continue;
  const source = `${dir}/${file}`;
  originalBytes += (await stat(source)).size;
  for (const width of [400, 800]) {
    const output = `${dir}/responsive/${file.replace('.jpg', '')}-${width}.webp`;
    await sharp(source).resize({ width, withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 }).toFile(output);
    if (width === 400) smallBytes += (await stat(output)).size;
    else largeBytes += (await stat(output)).size;
  }
}
console.log(JSON.stringify({ originalBytes, smallBytes, largeBytes }));
