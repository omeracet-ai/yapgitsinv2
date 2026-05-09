// Phase 178 — boot-check.js
// iisnode entrypoint wrapper. Verifies environment BEFORE bootstrapping NestJS.
// On failure, dumps a structured JSON to stderr (visible in iisnode/*.txt logs)
// and exits with code 1, so iisnode shows a clean 502 instead of opaque 500.
//
// Deployed to: D:\backend\boot-check.js (copied by scripts/deploy-to-d.sh)
// Referenced by: D:\backend\web.config — handler/rewrite point here, not src/main.js
'use strict';

const fs = require('fs');
const path = require('path');

const checks = [];
function check(name, fn) {
  try {
    const value = fn();
    checks.push({ name, ok: !!value, detail: typeof value === 'string' ? value : null });
  } catch (e) {
    checks.push({ name, ok: false, error: e && e.message ? e.message : String(e) });
  }
}

check('node_modules dir exists', () =>
  fs.existsSync(path.join(__dirname, 'node_modules')));
check('package.json readable', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  return pkg.name || 'unnamed';
});
check('src/main.js exists', () =>
  fs.existsSync(path.join(__dirname, 'src', 'main.js')));
check('.env.production exists', () =>
  fs.existsSync(path.join(__dirname, '.env.production')));
check('@nestjs/core resolvable', () => require.resolve('@nestjs/core'));
check('@nestjs/platform-express resolvable', () =>
  require.resolve('@nestjs/platform-express'));
check('typeorm resolvable', () => require.resolve('typeorm'));
check('mysql2 driver resolvable', () => require.resolve('mysql2'));
check('helmet resolvable', () => require.resolve('helmet'));

const failed = checks.filter((c) => !c.ok);

// Always log a one-line summary so iisnode logs always have signal.
console.log(
  '[boot-check]',
  'node=' + process.version,
  'pid=' + process.pid,
  'checks=' + checks.length,
  'failed=' + failed.length,
);

if (failed.length > 0) {
  console.error('=== BOOT CHECK FAILED ===');
  console.error(JSON.stringify({
    nodeVersion: process.version,
    cwd: process.cwd(),
    __dirname,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'unset',
      DB_HOST: process.env.DB_HOST ? '***set***' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? '***set***' : 'MISSING',
    },
    checks,
    failed: failed.map((f) => f.name),
  }, null, 2));
  process.exit(1);
}

// Top-level safety net — surface any later crash to iisnode logs clearly.
process.on('uncaughtException', (err) => {
  console.error('[boot-check] uncaughtException:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[boot-check] unhandledRejection:', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

// Hand off to the actual NestJS app.
console.log('[boot-check] all checks passed, starting NestJS app…');
require('./src/main.js');
