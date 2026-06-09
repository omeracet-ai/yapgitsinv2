import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SaaS modules (Faz G+H+I) — 8 tables for admin SaaS suite.
 *
 * Tables:
 *   - admin_chat_messages   (M1 AI Operations Assistant history)
 *   - notfound_log          (M2 404 monitor)
 *   - redirects             (M2 redirect rules)
 *   - gsc_cache             (M3 GSC fetch cache 1h)
 *   - message_log           (M8 outbound message audit)
 *   - loyalty_transactions  (M10 admin grants)
 *   - pillar_pages          (M5 SEO pillars)
 *   - blog_drafts           (M4 keyword finder drafts)
 *
 * Idempotent: all CREATE/INDEX use IF NOT EXISTS.
 */
export class AddSaasModules1749000000000 implements MigrationInterface {
  name = 'AddSaasModules1749000000000';

  public async up(qr: QueryRunner): Promise<void> {
    // M1 — admin_chat_messages
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "admin_chat_messages" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "sessionId" varchar(64) NOT NULL,
        "role" varchar(16) NOT NULL,
        "content" text NOT NULL,
        "mode" varchar(32) NOT NULL DEFAULT 'general',
        "adminId" varchar(64) DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_chat_session" ON "admin_chat_messages" ("sessionId")`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_admin_chat_admin" ON "admin_chat_messages" ("adminId")`,
    );

    // M2 — notfound_log
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "notfound_log" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "url" varchar(512) NOT NULL,
        "hitCount" integer NOT NULL DEFAULT 1,
        "referrer" varchar(64) DEFAULT NULL,
        "ipHash" varchar(64) DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "lastSeenAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_notfound_url" ON "notfound_log" ("url")`,
    );

    // M2 — redirects
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "redirects" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "src" varchar(512) NOT NULL,
        "dst" varchar(512) NOT NULL,
        "status" integer NOT NULL DEFAULT 301,
        "hits" integer NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT 1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_redirect_src" ON "redirects" ("src")`,
    );

    // M3 — gsc_cache
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "gsc_cache" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "key" varchar(128) NOT NULL,
        "payload" text NOT NULL,
        "expiresAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_gsc_key" ON "gsc_cache" ("key")`,
    );

    // M8 — message_log
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "message_log" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "channel" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'sent',
        "recipient" varchar(255) NOT NULL,
        "subject" varchar(255) DEFAULT NULL,
        "body" text DEFAULT NULL,
        "error" text DEFAULT NULL,
        "meta" text DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_msglog_channel" ON "message_log" ("channel")`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_msglog_status" ON "message_log" ("status")`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_msglog_created" ON "message_log" ("createdAt")`,
    );

    // M10 — loyalty_transactions
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "userId" varchar(64) NOT NULL,
        "type" varchar(16) NOT NULL,
        "points" integer NOT NULL DEFAULT 0,
        "reason" varchar(255) DEFAULT NULL,
        "meta" text DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_loyalty_user" ON "loyalty_transactions" ("userId")`,
    );

    // M5 — pillar_pages
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "pillar_pages" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "slug" varchar(120) NOT NULL,
        "title" varchar(200) NOT NULL,
        "topic" varchar(120) NOT NULL,
        "content" text DEFAULT NULL,
        "clusterPostIds" text DEFAULT NULL,
        "seoMetaTitle" varchar(200) DEFAULT NULL,
        "seoMetaDesc" varchar(300) DEFAULT NULL,
        "generationStatus" varchar(16) NOT NULL DEFAULT 'idle',
        "generationError" text DEFAULT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pillar_slug" ON "pillar_pages" ("slug")`,
    );

    // M4 — blog_drafts
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "blog_drafts" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "query" varchar(200) NOT NULL,
        "slug" varchar(200) NOT NULL,
        "markdown" text NOT NULL,
        "gscPosition" real DEFAULT NULL,
        "gscImpressions" integer DEFAULT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'draft',
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_draft_slug" ON "blog_drafts" ("slug")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "blog_drafts"`);
    await qr.query(`DROP TABLE IF EXISTS "pillar_pages"`);
    await qr.query(`DROP TABLE IF EXISTS "loyalty_transactions"`);
    await qr.query(`DROP TABLE IF EXISTS "message_log"`);
    await qr.query(`DROP TABLE IF EXISTS "gsc_cache"`);
    await qr.query(`DROP TABLE IF EXISTS "redirects"`);
    await qr.query(`DROP TABLE IF EXISTS "notfound_log"`);
    await qr.query(`DROP TABLE IF EXISTS "admin_chat_messages"`);
  }
}
