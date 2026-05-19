/**
 * Boot-time self-healing SQLite schema migration.
 *
 * Runs BEFORE NestFactory.create() so TypeORM doesn't crash on missing columns
 * when `synchronize: false` (prod). Idempotent: PRAGMA-based detection ensures
 * each ALTER/CREATE only fires when needed.
 *
 * No-op for non-sqlite DB types (mysql/postgres go through TypeORM migrations).
 */
import sqlite3 from 'sqlite3';
import { isAbsolute, join } from 'path';
import { Logger } from '@nestjs/common';
import { APP_ROOT } from '../common/paths';

function resolveSqlitePath(name: string): string {
  return name === ':memory:' || isAbsolute(name) ? name : join(APP_ROOT, name);
}

interface SqliteRow {
  found?: number;
  [key: string]: unknown;
}

export async function applyBootMigrations(): Promise<void> {
  const logger = new Logger('BootMigrations');
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (dbType !== 'sqlite') {
    logger.log(`non-sqlite DB (${dbType}), skipping boot migrations`);
    return;
  }

  const dbPath = resolveSqlitePath(
    process.env.DB_DATABASE || process.env.DB_NAME || 'hizmet_db.sqlite',
  );
  logger.log(`started — opening ${dbPath}`);

  const db: sqlite3.Database = await new Promise((resolve, reject) => {
    const handle = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(handle);
    });
  });

  const get = (sql: string, params: unknown[] = []): Promise<SqliteRow | undefined> =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as SqliteRow | undefined);
      });
    });

  const run = (sql: string): Promise<void> =>
    new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  try {
    // A + B: users columns (defaultIban, defaultAccountHolderName)
    const userCols: { name: string; type: string }[] = [
      { name: 'defaultIban', type: 'VARCHAR(34)' },
      { name: 'defaultAccountHolderName', type: 'VARCHAR(100)' },
    ];
    for (const col of userCols) {
      try {
        const exists = await get(
          `SELECT 1 AS found FROM pragma_table_info('users') WHERE name = ?`,
          [col.name],
        );
        if (!exists) {
          try {
            await run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            logger.log(`added users.${col.name}`);
          } catch (e) {
            logger.warn(
              `add users.${col.name} skipped: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } catch (e) {
        logger.warn(
          `detect users.${col.name} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // C: withdrawal_requests table + indexes
    try {
      const tbl = await get(
        `SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name='withdrawal_requests'`,
      );
      if (!tbl) {
        await run(
          `CREATE TABLE withdrawal_requests (
            id VARCHAR(36) PRIMARY KEY NOT NULL,
            workerId VARCHAR(36) NOT NULL,
            amountMinor INTEGER NOT NULL,
            iban VARCHAR(34) NOT NULL,
            accountHolderName VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','completed')),
            requestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processedAt DATETIME,
            processedBy VARCHAR(36),
            adminNote TEXT,
            workerNote TEXT
          )`,
        );
        await run(
          `CREATE INDEX idx_withdrawal_requests_worker_status ON withdrawal_requests(workerId, status)`,
        );
        await run(
          `CREATE INDEX idx_withdrawal_requests_status_requested ON withdrawal_requests(status, requestedAt)`,
        );
        logger.log('created withdrawal_requests + indexes');
      }
    } catch (e) {
      logger.warn(
        `withdrawal_requests setup skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    logger.log('all up-to-date');
  } finally {
    await new Promise<void>((resolve) => db.close(() => resolve()));
  }
}
