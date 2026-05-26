import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 255 (Voldi-db) — Soft-delete columns on `users` for JWT security hardening.
 *
 * Adds:
 *   - `deletedAt` (datetime, nullable) — soft-delete tombstone.
 *   - `scheduledHardDeleteAt` (datetime, nullable) — cron-driven PII purge timestamp.
 *
 * Note: `tokenVersion` was already shipped by `1747267200000-AddTokenVersion`
 * (Phase P188/4). It is intentionally NOT re-added here. The migration name keeps
 * "AndTokenVersion" only to match the Phase 255 spec; the column is reused.
 *
 * Indexes (partial — only non-NULL rows, keeps index small):
 *   - `idx_users_deletedAt`            : fast "active users" filter.
 *   - `idx_users_scheduledHardDelete`  : cron sweep for due-for-purge accounts.
 *
 * Driver matrix:
 *   - SQLite + Postgres   : partial index (`WHERE col IS NOT NULL`) supported.
 *   - MySQL/MariaDB       : no partial index; falls back to plain index.
 *
 * Idempotent on all paths (ADD COLUMN wrapped in try/catch on "duplicate column",
 * CREATE INDEX uses IF NOT EXISTS).
 */
export class AddSoftDeleteAndTokenVersion1748000000000 implements MigrationInterface {
  name = 'AddSoftDeleteAndTokenVersion1748000000000';

  private async safeAdd(
    qr: QueryRunner,
    table: string,
    column: string,
    ddl: string,
  ): Promise<void> {
    try {
      await qr.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column name|already exists/i.test(msg)) throw err;
    }
  }

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    await this.safeAdd(qr, 'users', 'deletedAt', 'datetime NULL');
    await this.safeAdd(qr, 'users', 'scheduledHardDeleteAt', 'datetime NULL');

    // tokenVersion already exists from migration 1747267200000; safeAdd is a no-op
    // if so, but we include it defensively for environments that skipped it.
    await this.safeAdd(
      qr,
      'users',
      'tokenVersion',
      'integer NOT NULL DEFAULT 0',
    );

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(`CREATE INDEX idx_users_deletedAt ON users (deletedAt)`);
      } else {
        await qr.query(
          `CREATE INDEX IF NOT EXISTS idx_users_deletedAt ` +
            `ON users ("deletedAt") WHERE "deletedAt" IS NOT NULL`,
        );
      }
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `CREATE INDEX idx_users_scheduledHardDelete ` +
            `ON users (scheduledHardDeleteAt)`,
        );
      } else {
        await qr.query(
          `CREATE INDEX IF NOT EXISTS idx_users_scheduledHardDelete ` +
            `ON users ("scheduledHardDeleteAt") ` +
            `WHERE "scheduledHardDeleteAt" IS NOT NULL`,
        );
      }
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(`DROP INDEX idx_users_scheduledHardDelete ON users`);
      } else {
        await qr.query(`DROP INDEX IF EXISTS idx_users_scheduledHardDelete`);
      }
    } catch {
      /* ignore */
    }

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(`DROP INDEX idx_users_deletedAt ON users`);
      } else {
        await qr.query(`DROP INDEX IF EXISTS idx_users_deletedAt`);
      }
    } catch {
      /* ignore */
    }

    // tokenVersion is shared with Phase P188/4 migration — DO NOT drop here.
    try {
      await qr.query(`ALTER TABLE users DROP COLUMN scheduledHardDeleteAt`);
    } catch {
      /* SQLite < 3.35 has no DROP COLUMN; safe to ignore. */
    }
    try {
      await qr.query(`ALTER TABLE users DROP COLUMN deletedAt`);
    } catch {
      /* ignore */
    }
  }
}
