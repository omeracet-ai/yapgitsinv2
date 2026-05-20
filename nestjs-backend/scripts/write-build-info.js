// Phase 258 (rev) — emit build metadata after `nest build`.
// Writes dist/src/build-info.json (NO leading dot, so FTP/IIS deploys never
// skip it). health.service reads it at module load — env-independent, so the
// /health `commit`/`version` fields work on Plesk without process env vars.
//
// On deploy, dist/src/* is flattened to D:\backend\src\*, so this file lands at
// D:\backend\src\build-info.json, exactly where health.service looks.
const { execFileSync } = require('child_process');
const { writeFileSync, readFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');

let commit = (process.env.GIT_COMMIT || process.env.GIT_SHA || '').trim();
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    })
      .toString()
      .trim();
  } catch {
    commit = 'unknown';
  }
}

let version = '0.0.1';
try {
  version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')).version;
} catch {
  /* keep fallback */
}

const outDir = join(root, 'dist', 'src');
try {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const out = join(outDir, 'build-info.json');
  writeFileSync(
    out,
    JSON.stringify({ commit, version, builtAt: new Date().toISOString() }),
  );
  console.log(`✓ build-info.json yazildi: commit=${commit} version=${version}`);
} catch (e) {
  console.warn('build-info.json yazilamadi:', e && e.message ? e.message : e);
}
