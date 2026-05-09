#!/usr/bin/env node
/* eslint-disable */
/**
 * Apply scripts/migrations/*.sql against production MariaDB.
 *
 * Reads connection from nestjs-backend/.env.production
 * (with optional override from .env.production.local).
 *
 * Usage:  node scripts/migrate-prod.js
 *         node scripts/migrate-prod.js 001_blog_posts.sql   # single file
 *
 * Idempotent: SQL files use CREATE TABLE IF NOT EXISTS / ALTER ... IF NOT EXISTS.
 * Tracks applied files in a `_migrations` table.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_DIR = path.join(ROOT, 'nestjs-backend');
const MIG_DIR = path.join(ROOT, 'scripts', 'migrations');

// Resolve mysql2 from nestjs-backend's node_modules (where it's already installed).
const mysql = require(path.join(ENV_DIR, 'node_modules', 'mysql2', 'promise'));

function parseEnv(p) {
  if (!fs.existsSync(p)) return {};
  return Object.fromEntries(
    fs.readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

(async () => {
  const cfg = {
    ...parseEnv(path.join(ENV_DIR, '.env.production')),
    ...parseEnv(path.join(ENV_DIR, '.env.production.local')),
  };
  if (!cfg.DB_HOST || !cfg.DB_USERNAME) {
    console.error('Missing DB_HOST / DB_USERNAME in nestjs-backend/.env.production');
    process.exit(1);
  }

  const c = await mysql.createConnection({
    host: cfg.DB_HOST,
    port: +cfg.DB_PORT,
    user: cfg.DB_USERNAME,
    password: cfg.DB_PASSWORD,
    database: cfg.DB_NAME,
    multipleStatements: true,
  });

  await c.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename VARCHAR(255) PRIMARY KEY,
      appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const onlyFile = process.argv[2];
  const files = onlyFile
    ? [onlyFile]
    : fs.readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();

  for (const f of files) {
    const [rows] = await c.query('SELECT 1 FROM _migrations WHERE filename = ?', [f]);
    if (rows.length) {
      console.log(`[skip] ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
    console.log(`[apply] ${f}`);
    await c.query(sql);
    await c.query('INSERT INTO _migrations (filename) VALUES (?)', [f]);
    console.log(`[ok] ${f}`);
  }

  await c.end();
  console.log('done.');
})().catch(e => {
  console.error('FAIL:', e.code || e.message);
  process.exit(1);
});
