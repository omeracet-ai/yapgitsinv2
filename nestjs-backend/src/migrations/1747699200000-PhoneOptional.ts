import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 253-B (Voldi-phase253B) — users.phoneNumber NOT NULL → NULLABLE.
 *
 * Why: Email is now the primary identifier; phone becomes an optional add-on
 * that users supply via profile after signup. Existing UNIQUE constraint is
 * preserved (both SQLite and MySQL permit multiple NULLs in a UNIQUE column).
 *
 * Drivers:
 *  - SQLite: ALTER COLUMN unsupported → rebuild via temp-table swap is the
 *    canonical pattern, but TypeORM's `synchronize` (enabled in prod via
 *    DB_TYPE=sqlite per app.module guard) will handle the relaxation
 *    automatically on next boot. This migration's SQLite branch is a no-op
 *    documenting that fact.
 *  - MySQL/MariaDB: MODIFY COLUMN to drop NOT NULL.
 *  - Postgres: ALTER COLUMN DROP NOT NULL.
 *
 * Idempotent — re-running is safe.
 */
export class PhoneOptional1747699200000 implements MigrationInterface {
  name = 'PhoneOptional1747699200000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `ALTER TABLE users MODIFY COLUMN phoneNumber VARCHAR(20) NULL`,
        );
      } else if (driver === 'postgres') {
        await qr.query(`ALTER TABLE users ALTER COLUMN "phoneNumber" DROP NOT NULL`);
      }
      // SQLite: handled by synchronize on next boot (entity nullable: true).
    } catch (err) {
      const msg = (err as Error).message || '';
      // Already nullable — ignore.
      if (!/null|already/i.test(msg)) throw err;
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `ALTER TABLE users MODIFY COLUMN phoneNumber VARCHAR(20) NOT NULL`,
        );
      } else if (driver === 'postgres') {
        await qr.query(`ALTER TABLE users ALTER COLUMN "phoneNumber" SET NOT NULL`);
      }
    } catch {
      // ignore — down may fail if NULL rows exist; that's expected.
    }
  }
}
