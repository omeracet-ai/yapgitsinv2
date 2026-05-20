#!/usr/bin/env node
/**
 * migration:check — report pending TypeORM migrations and FAIL (exit 1) if any.
 *
 * Why a wrapper instead of `migration:show --exitCode`?
 *   TypeORM 0.3.x `migration:show` ALWAYS exits 0 on success — it does not
 *   surface "are there pending migrations?" via the exit code, and the
 *   `--exitCode` flag is silently ignored in this version. CI/cutover checks
 *   need a non-zero exit when migrations are pending, so we parse the output.
 *
 * Output legend (TypeORM):
 *   [X] = applied      [ ] = pending
 *
 * Usage:
 *   npm run migration:check          # exit 0 = all applied, exit 1 = pending/err
 *
 * Mirrors the repo's CLI invocation:
 *   typeorm-ts-node-commonjs migration:show -d src/data-source.ts
 */
const { spawnSync } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');
const bin = process.platform === 'win32'
  ? 'typeorm-ts-node-commonjs.cmd'
  : 'typeorm-ts-node-commonjs';
const binPath = path.join(cwd, 'node_modules', '.bin', bin);

const res = spawnSync(
  binPath,
  ['migration:show', '-d', 'src/data-source.ts'],
  { cwd, encoding: 'utf8', shell: process.platform === 'win32' },
);

const stdout = res.stdout || '';
const stderr = res.stderr || '';
process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);

// CLI itself failed to connect / load DataSource.
if (res.status !== 0 && res.status !== null) {
  console.error('\n[migration:check] typeorm CLI failed (see error above).');
  process.exit(res.status);
}

const lines = (stdout + '\n' + stderr).split(/\r?\n/);
const pending = lines.filter((l) => /\[\s\]/.test(l));
const applied = lines.filter((l) => /\[X\]/i.test(l));

if (pending.length > 0) {
  console.error(
    `\n[migration:check] FAIL — ${pending.length} pending migration(s):`,
  );
  for (const l of pending) console.error('  ' + l.trim());
  process.exit(1);
}

console.log(
  `\n[migration:check] OK — ${applied.length} applied, 0 pending.`,
);
process.exit(0);
