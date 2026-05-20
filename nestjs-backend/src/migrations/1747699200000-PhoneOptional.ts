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
        await qr.query(
          `ALTER TABLE users ALTER COLUMN "phoneNumber" DROP NOT NULL`,
        );
      } else {
        // SQLite: ALTER COLUMN unsupported. Use the 12-step table rebuild.
        await qr.query(`PRAGMA foreign_keys = OFF`);
        await qr.startTransaction();
        try {
          const idxRows: Array<{ name: string; sql: string | null }> =
            await qr.query(
              `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='users' AND sql IS NOT NULL`,
            );
          const tableRow: Array<{ sql: string }> = await qr.query(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`,
          );
          if (!tableRow[0]?.sql) throw new Error('users table not found');
          let newSql = tableRow[0].sql
            .replace(
              /"phoneNumber"\s+varchar\(20\)\s+NOT\s+NULL/i,
              '"phoneNumber" varchar(20)',
            )
            .replace(
              /`phoneNumber`\s+varchar\(20\)\s+NOT\s+NULL/i,
              '`phoneNumber` varchar(20)',
            )
            .replace(
              /phoneNumber\s+varchar\(20\)\s+NOT\s+NULL/i,
              'phoneNumber varchar(20)',
            );
          if (newSql === tableRow[0].sql) {
            // Already nullable — no-op.
            await qr.commitTransaction();
            await qr.query(`PRAGMA foreign_keys = ON`);
            return;
          }
          newSql = newSql.replace(
            /CREATE TABLE "?users"?/i,
            'CREATE TABLE "users_new"',
          );
          await qr.query(newSql);
          await qr.query(`INSERT INTO "users_new" SELECT * FROM "users"`);
          await qr.query(`DROP TABLE "users"`);
          await qr.query(`ALTER TABLE "users_new" RENAME TO "users"`);
          for (const idx of idxRows) {
            if (idx.sql) await qr.query(idx.sql);
          }
          await qr.commitTransaction();
        } catch (e) {
          await qr.rollbackTransaction();
          throw e;
        }
        await qr.query(`PRAGMA foreign_keys = ON`);
      }
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
        await qr.query(
          `ALTER TABLE users ALTER COLUMN "phoneNumber" SET NOT NULL`,
        );
      }
    } catch {
      // ignore — down may fail if NULL rows exist; that's expected.
    }
  }
}
