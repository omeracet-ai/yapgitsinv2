import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 253-C (Voldi-phase253C) — Retry of PhoneOptional1747699200000.
 *
 * Why: The original PhoneOptional1747699200000 migration ran on prod while its
 * SQLite branch was still a documented no-op, leaving users.phoneNumber as
 * NOT NULL in production despite the migration row being recorded. TypeORM
 * will never re-run a migration whose row already exists in the migrations
 * table, so we ship a fresh migration (later timestamp) that performs the
 * canonical 12-step SQLite table rebuild and the equivalent ALTER on
 * MySQL/Postgres.
 *
 * Idempotency: The SQLite branch inspects the live CREATE TABLE statement and
 * exits early when phoneNumber is already nullable (regex newSql === oldSql
 * skip). Local environments where 253-B was effective (or where TypeORM
 * synchronize relaxed the column) become no-ops. Prod, where the column is
 * still NOT NULL, gets the rebuild. The MySQL/Postgres branches are wrapped
 * in a /null|already/i error filter so re-running is safe everywhere.
 */
export class PhoneOptionalRetry1747785600000 implements MigrationInterface {
  name = 'PhoneOptionalRetry1747785600000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `ALTER TABLE users MODIFY COLUMN phoneNumber VARCHAR(20) NULL`,
        );
      } else if (driver === 'postgres') {
        await qr.query(`ALTER TABLE users ALTER COLUMN "phoneNumber" DROP NOT NULL`);
      } else {
        // SQLite: ALTER COLUMN unsupported. Use the 12-step table rebuild.
        await qr.query(`PRAGMA foreign_keys = OFF`);
        await qr.startTransaction();
        try {
          const idxRows: Array<{ name: string; sql: string | null }> = await qr.query(
            `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='users' AND sql IS NOT NULL`,
          );
          const tableRow: Array<{ sql: string }> = await qr.query(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`,
          );
          if (!tableRow[0]?.sql) throw new Error('users table not found');
          let newSql = tableRow[0].sql
            .replace(/"phoneNumber"\s+varchar\(20\)\s+NOT\s+NULL/i, '"phoneNumber" varchar(20)')
            .replace(/`phoneNumber`\s+varchar\(20\)\s+NOT\s+NULL/i, '`phoneNumber` varchar(20)')
            .replace(/phoneNumber\s+varchar\(20\)\s+NOT\s+NULL/i, 'phoneNumber varchar(20)');
          if (newSql === tableRow[0].sql) {
            // Already nullable — no-op.
            await qr.commitTransaction();
            await qr.query(`PRAGMA foreign_keys = ON`);
            return;
          }
          newSql = newSql.replace(/CREATE TABLE "?users"?/i, 'CREATE TABLE "users_new"');
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
        await qr.query(`ALTER TABLE users ALTER COLUMN "phoneNumber" SET NOT NULL`);
      }
    } catch {
      // ignore — down may fail if NULL rows exist; that's expected.
    }
  }
}
