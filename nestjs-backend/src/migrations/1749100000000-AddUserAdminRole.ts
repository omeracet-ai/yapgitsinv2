import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hotfix (2026-06-10) — `users.adminRole` sütunu.
 *
 * Faz J commit `c048ac52` `User` entity'e `adminRole` ekledi ama
 * `AddSaasModules1749000000000` migration'a yansımadı. Prod boot crashed:
 *   SQLITE_ERROR: no such column: User.adminRole
 *
 * SaaS migration zaten _migrations table'ında "çalıştı" işaretli olduğundan
 * ALTER orada eklense bile re-run edilmez. Bu fresh migration ile
 * idempotent olarak sütunu açıyoruz.
 */
export class AddUserAdminRole1749100000000 implements MigrationInterface {
  name = 'AddUserAdminRole1749100000000';

  public async up(qr: QueryRunner): Promise<void> {
    const cols = (await qr.query(`PRAGMA table_info("users")`)) as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === 'adminRole')) {
      await qr.query(
        `ALTER TABLE "users" ADD COLUMN "adminRole" varchar(32) DEFAULT NULL`,
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite no-DROP-COLUMN (CREATE-COPY-DROP gerekir). No-op.
    void qr;
  }
}
