import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 255b (Voldi-db) — Account temporary lock columns on `users`.
 *
 * Adds:
 *   - `failedLoginAttempts` (integer, NOT NULL, default 0) — failed login counter.
 *   - `lockedUntil`         (datetime, nullable) — lock expiry timestamp.
 *
 * Voldi-sec owns the increment/reset/threshold logic in `auth.service.ts`
 * and the 423 Locked response in `login-throttle.guard.ts`.
 *
 * Index (partial — only locked rows, keeps index small and hot):
 *   - `idx_users_lockedUntil` : fast scan for currently-locked accounts and
 *      future cron-driven lock expiry sweeps.
 *
 * Driver matrix:
 *   - SQLite + Postgres   : partial index (`WHERE col IS NOT NULL`) supported.
 *   - MySQL/MariaDB       : no partial index; falls back to plain index.
 *
 * Idempotent on all paths (ADD COLUMN wrapped in try/catch on "duplicate column",
 * CREATE INDEX uses IF NOT EXISTS).
 */
export class AddAccountLock1748100000000 implements MigrationInterface {
  name = 'AddAccountLock1748100000000';

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

    await this.safeAdd(
      qr,
      'users',
      'failedLoginAttempts',
      'integer NOT NULL DEFAULT 0',
    );
    await this.safeAdd(qr, 'users', 'lockedUntil', 'datetime NULL');

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `CREATE INDEX idx_users_lockedUntil ON users (lockedUntil)`,
        );
      } else {
        await qr.query(
          `CREATE INDEX IF NOT EXISTS idx_users_lockedUntil ` +
            `ON users ("lockedUntil") WHERE "lockedUntil" IS NOT NULL`,
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
        await qr.query(`DROP INDEX idx_users_lockedUntil ON users`);
      } else {
        await qr.query(`DROP INDEX IF EXISTS idx_users_lockedUntil`);
      }
    } catch {
      /* ignore */
    }

    try {
      await qr.query(`ALTER TABLE users DROP COLUMN lockedUntil`);
    } catch {
      /* SQLite < 3.35 has no DROP COLUMN; safe to ignore. */
    }
    try {
      await qr.query(`ALTER TABLE users DROP COLUMN failedLoginAttempts`);
    } catch {
      /* ignore */
    }
  }
}
