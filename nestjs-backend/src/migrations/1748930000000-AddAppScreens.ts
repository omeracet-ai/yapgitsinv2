import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 276 — All-Pages Registry.
 *
 * Adds the `app_screens` table. Idempotent CREATE TABLE IF NOT EXISTS so it
 * can run safely against existing DBs (SQLite primary target; Postgres/MySQL
 * compatible syntax).
 */
export class AddAppScreens1748930000000 implements MigrationInterface {
  name = 'AddAppScreens1748930000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_screens" (
        "key" varchar(64) PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text DEFAULT NULL,
        "iconName" varchar(64) DEFAULT NULL,
        "category" varchar(32) DEFAULT NULL,
        "visible" boolean NOT NULL DEFAULT 1,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "previewImageUrl" varchar(500) DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "IDX_app_screens_category" ON "app_screens" ("category")`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "IDX_app_screens_sortOrder" ON "app_screens" ("sortOrder")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "app_screens"`);
  }
}
