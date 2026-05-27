import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 268 — App config tables for APK runtime configuration.
 *
 * Creates: app_settings, app_themes, app_brandings, app_layouts,
 * app_visibility_rules. All CREATE TABLE IF NOT EXISTS — idempotent and
 * SQLite/Postgres/MySQL compatible.
 */
export class AddAppConfigTables1748920000000 implements MigrationInterface {
  name = 'AddAppConfigTables1748920000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" varchar(100) PRIMARY KEY NOT NULL,
        "value" text NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'string',
        "group" varchar(50) NOT NULL DEFAULT 'general',
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedBy" varchar(36) DEFAULT NULL
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_themes" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "name" varchar(50) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT 0,
        "tokens" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_app_themes_name" ON "app_themes" ("name")`,
    );

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_brandings" (
        "id" varchar(50) PRIMARY KEY NOT NULL DEFAULT 'default',
        "logoUrl" varchar(500) DEFAULT NULL,
        "iconUrl" varchar(500) DEFAULT NULL,
        "splashUrl" varchar(500) DEFAULT NULL,
        "appTitle" varchar(100) DEFAULT NULL,
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_layouts" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "screen" varchar(50) NOT NULL,
        "componentKey" varchar(50) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "visible" boolean NOT NULL DEFAULT 1,
        "props" text DEFAULT NULL,
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "app_visibility_rules" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "moduleKey" varchar(100) NOT NULL,
        "active" boolean NOT NULL DEFAULT 1,
        "roles" text DEFAULT NULL,
        "devices" text DEFAULT NULL,
        "activeFrom" datetime DEFAULT NULL,
        "activeUntil" datetime DEFAULT NULL,
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_app_visibility_moduleKey" ON "app_visibility_rules" ("moduleKey")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "app_visibility_rules"`);
    await qr.query(`DROP TABLE IF EXISTS "app_layouts"`);
    await qr.query(`DROP TABLE IF EXISTS "app_brandings"`);
    await qr.query(`DROP TABLE IF EXISTS "app_themes"`);
    await qr.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
