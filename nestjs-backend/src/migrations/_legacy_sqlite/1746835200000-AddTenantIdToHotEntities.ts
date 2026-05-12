import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 160 — Multi-tenant migration foundation.
 *
 * Adds `tenantId` column to all "hot" tenant-scoped tables, backfills the
 * default tenant (slug='tr'), and adds composite (tenantId, createdAt)
 * indexes for fast per-tenant feed queries.
 *
 * Idempotent — uses CREATE INDEX IF NOT EXISTS and guards ADD COLUMN with
 * try/catch so re-running on dev DBs (where TypeORM `synchronize: true`
 * already added the column) is safe.
 *
 * Compatible with both SQLite (dev) and PostgreSQL (prod).
 *
 * NOTE: TypeORM `synchronize: true` is currently enabled in dev — the
 * column will be auto-added on first boot. This migration exists for
 * production deployments and to guarantee the data backfill.
 */
export class AddTenantIdToHotEntities1746835200000 implements MigrationInterface {
  name = 'AddTenantIdToHotEntities1746835200000';

  // Hot entity tables that are tenant-scoped.
  private readonly HOT_TABLES = [
    'users',
    'jobs',
    'bookings',
    'offers',
    'reviews',
    'chat_messages',
    'notifications',
    'service_requests',
    'service_request_applications',
    'job_questions',
    'job_question_replies',
    'favorite_workers',
    'saved_jobs',
    'favorite_providers',
    'blog_posts',
    'category_subscriptions',
    'admin_audit_logs',
  ];

  public async up(qr: QueryRunner): Promise<void> {
    // 1. Add tenantId column to each table (idempotent — ignore "already exists")
    for (const table of this.HOT_TABLES) {
      try {
        await qr.query(`ALTER TABLE ${table} ADD COLUMN tenantId varchar(36) NULL`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate column|already exists/i.test(msg)) throw err;
      }
    }

    // 2. Resolve default tenant id (slug='tr'). If not present, skip backfill —
    //    TenantsService.onModuleInit will create it on next boot.
    const rows = (await qr.query(
      `SELECT id FROM tenants WHERE slug = 'tr' LIMIT 1`,
    )) as Array<{ id: string }>;
    const defaultTenantId = rows[0]?.id;

    if (defaultTenantId) {
      for (const table of this.HOT_TABLES) {
        await qr.query(
          `UPDATE ${table} SET tenantId = ? WHERE tenantId IS NULL`,
          [defaultTenantId],
        );
      }
    }

    // 3. Composite indexes for tenant-scoped feed queries.
    //    Tables without `createdAt` get a single-column tenantId index.
    const withCreatedAt = new Set([
      'users', 'jobs', 'bookings', 'offers', 'reviews', 'chat_messages',
      'notifications', 'service_requests', 'service_request_applications',
      'job_questions', 'job_question_replies', 'favorite_workers',
      'saved_jobs', 'favorite_providers', 'blog_posts',
      'category_subscriptions', 'admin_audit_logs',
    ]);
    for (const table of this.HOT_TABLES) {
      if (withCreatedAt.has(table)) {
        await qr.query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_tenantId_createdAt ` +
          `ON ${table} (tenantId, createdAt)`,
        );
      } else {
        await qr.query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_tenantId ON ${table} (tenantId)`,
        );
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    for (const table of this.HOT_TABLES) {
      await qr.query(`DROP INDEX IF EXISTS idx_${table}_tenantId_createdAt`);
      await qr.query(`DROP INDEX IF EXISTS idx_${table}_tenantId`);
      try {
        await qr.query(`ALTER TABLE ${table} DROP COLUMN tenantId`);
      } catch {
        // SQLite < 3.35 doesn't support DROP COLUMN — ignore.
      }
    }
  }
}
