// Local dev server.
//
// The pages load the built assets/css/style.min.css and assets/js/*.min.js, not
// the sources — so serving the folder alone would make edits to style.css or
// script.js look like they did nothing. This watches the sources and rebuilds
// on save, then serves the site.
//
// Usage: npm run dev  [-- --port 5000]

import esbuild from 'esbuild';
import process from 'node:process';
import { targets } from './lib/build-targets.mjs';

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 4173;

// Report rebuilds so a syntax error is visible instead of silently serving stale output.
const logRebuild = {
  name: 'log-rebuild',
  setup(build) {
    const label = build.initialOptions.outfile;
    build.onEnd((result) => {
      const when = new Date().toLocaleTimeString();
      if (result.errors.length) console.error(`[${when}] ✗ ${label} — ${result.errors.length} error(s)`);
      else console.log(`[${when}] ✓ ${label}`);
    });
  },
};

const contexts = await Promise.all(
  targets.map((t) =>
    esbuild.context({
      entryPoints: [t.in],
      outfile: t.out,
      minify: true,
      allowOverwrite: true,
      charset: 'utf8',           // keep Hebrew literals as UTF-8, not \uXXXX
      logLevel: 'silent',
      plugins: [logRebuild],
    }),
  ),
);

await Promise.all(contexts.map((c) => c.watch()));

// Serve from the project root so every existing relative path keeps working.
const { hosts, port } = await contexts[0].serve({ servedir: '.', port: PORT });
console.log(`\n  Studio Cover Design — dev server\n  http://localhost:${port}  (${hosts.join(', ')})\n  watching CSS/JS sources; Ctrl+C to stop\n`);
