import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 130 — Performance index sweep.
 *
 * Adds composite indexes for hot query paths identified in the DB audit
 * (docs/performance/phase-130-db-audit.md). Uses CREATE INDEX IF NOT EXISTS
 * so it's idempotent and safe to re-run on dev DBs that already have
 * `synchronize: true` schemas.
 *
 * Compatible with both SQLite (dev) and PostgreSQL (prod). JSON/GIN indexes
 * for `users.workerCategories` are deliberately omitted because SQLite has
 * no equivalent — a Postgres-only follow-up migration should add them.
 */
export class AddPerformanceIndexes1746748800000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1746748800000';

  public async up(qr: QueryRunner): Promise<void> {
    const stmts = [
      // Job feed: status + createdAt drives the public listing; customerId for "my jobs".
      `CREATE INDEX IF NOT EXISTS idx_jobs_status_createdAt ON jobs (status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_customerId_status ON jobs (customerId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_deletedAt ON jobs (deletedAt)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_categoryId_status ON jobs (categoryId, status)`,

      // Offers: lookup by job + status filter is the dominant pattern.
      `CREATE INDEX IF NOT EXISTS idx_offers_jobId_status ON offers (jobId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_offers_userId_status ON offers (userId, status)`,

      // Bookings: per-user calendar queries by date.
      `CREATE INDEX IF NOT EXISTS idx_bookings_customerId_date ON bookings (customerId, scheduledDate)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_workerId_date ON bookings (workerId, scheduledDate)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_status_createdAt ON bookings (status, createdAt)`,

      // Notifications: feed + unread badge.
      `CREATE INDEX IF NOT EXISTS idx_notifications_userId_isRead_createdAt ON notifications (userId, isRead, createdAt)`,

      // Chat history: conversation between two users, ordered by time.
      // Schema uses (from, to) instead of roomId; index both directions.
      `CREATE INDEX IF NOT EXISTS idx_chat_from_to_createdAt ON chat_messages ("from", "to", createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_to_from_createdAt ON chat_messages ("to", "from", createdAt)`,

      // Audit log: filter by action/target with time ordering.
      `CREATE INDEX IF NOT EXISTS idx_audit_action_createdAt ON admin_audit_logs (action, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_targetType_targetId ON admin_audit_logs (targetType, targetId)`,

      // Worker discovery: city + district + availability.
      `CREATE INDEX IF NOT EXISTS idx_users_city_district_isAvailable ON users (city, district, isAvailable)`,
      `CREATE INDEX IF NOT EXISTS idx_users_isAvailable_reputation ON users (isAvailable, reputationScore)`,

      // Reviews: revieweeId is the hot path (public profile aggregation).
      `CREATE INDEX IF NOT EXISTS idx_reviews_revieweeId_createdAt ON reviews (revieweeId, createdAt)`,

      // Service requests feed.
      `CREATE INDEX IF NOT EXISTS idx_service_requests_status_createdAt ON service_requests (status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_service_requests_userId_status ON service_requests (userId, status)`,
    ];

    for (const sql of stmts) {
      await qr.query(sql);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const drops = [
      'idx_jobs_status_createdAt',
      'idx_jobs_customerId_status',
      'idx_jobs_deletedAt',
      'idx_jobs_categoryId_status',
      'idx_offers_jobId_status',
      'idx_offers_userId_status',
      'idx_bookings_customerId_date',
      'idx_bookings_workerId_date',
      'idx_bookings_status_createdAt',
      'idx_notifications_userId_isRead_createdAt',
      'idx_chat_from_to_createdAt',
      'idx_chat_to_from_createdAt',
      'idx_audit_action_createdAt',
      'idx_audit_targetType_targetId',
      'idx_users_city_district_isAvailable',
      'idx_users_isAvailable_reputation',
      'idx_reviews_revieweeId_createdAt',
      'idx_service_requests_status_createdAt',
      'idx_service_requests_userId_status',
    ];
    for (const name of drops) {
      await qr.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
