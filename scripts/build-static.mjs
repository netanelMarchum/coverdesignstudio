// Publish runtime files only; build inputs remain available to Vercel's build.
// Root api/ functions are bundled separately by Vercel, outside the static output.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { relative, sep } from 'node:path';

const output = 'dist';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of await readdir('.')) {
  if ((file.endsWith('.html') && file !== 'index-v2.html') ||
      ['robots.txt', 'sitemap.xml'].includes(file)) {
    await cp(file, `${output}/${file}`);
  }
}
await cp('assets', `${output}/assets`, {
  recursive: true,
  filter: (source) => {
    const path = relative('.', source).split(sep).join('/');
    if (path === 'assets/img/asset bk') return false;
    if (/\.(css|js)$/.test(path)) {
      return path.endsWith('.min.css') || path.endsWith('.min.js')
        ? !path.includes('/studio-v2.min.') : false;
    }
    return true;
  },
});
console.log('Static runtime files staged in dist/; build inputs excluded.');
