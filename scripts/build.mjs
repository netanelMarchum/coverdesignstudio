// Production build: minify every CSS/JS entry the pages load.
//
// Usage: npm run build
import esbuild from 'esbuild';
import { stat } from 'node:fs/promises';
import process from 'node:process';
import { targets } from './lib/build-targets.mjs';

const size = async (p) => {
  try { return (await stat(p)).size; } catch { return 0; }
};

let rawTotal = 0;
let minTotal = 0;
let failed = 0;

for (const t of targets) {
  const before = await size(t.in);
  try {
    await esbuild.build({
      entryPoints: [t.in],
      outfile: t.out,
      minify: true,
      allowOverwrite: true,
      legalComments: 'none',
      // Without this esbuild escapes every non-ASCII character to \uXXXX — six
      // bytes per Hebrew letter instead of two, which made the minified i18n
      // bundle 21% LARGER than its source. Every page declares UTF-8.
      charset: 'utf8',
      logLevel: 'silent',
    });
  } catch (err) {
    failed++;
    console.error(`✗ ${t.in}\n${err.message}`);
    continue;
  }
  const after = await size(t.out);
  rawTotal += before;
  minTotal += after;
  const saved = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(
    `  ${t.out.padEnd(40)} ${(before / 1024).toFixed(1).padStart(6)}K → ${(after / 1024).toFixed(1).padStart(6)}K  (-${saved}%)`,
  );
}

console.log(
  `\n${targets.length - failed}/${targets.length} bundled  ` +
  `${(rawTotal / 1024).toFixed(1)}K → ${(minTotal / 1024).toFixed(1)}K ` +
  `(saved ${((rawTotal - minTotal) / 1024).toFixed(1)}K)`,
);

if (failed) process.exit(1);
