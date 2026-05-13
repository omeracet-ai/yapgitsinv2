import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 184 — Hot column index sweep (Voldi-db).
 *
 * Adds composite/single-column indexes for the highest-traffic query patterns
 * that were still un-indexed after the Phase 130 sweep:
 *   - bookings: (workerId/customerId, status, createdAt) for "my bookings" lists
 *   - booking_escrows: status + (workerId, status) for payout queues
 *   - payment_escrows: status + paymentStatus + (taskerId, status)
 *   - worker_boosts: (status, expiresAt) for the cron expiry scan
 *   - notifications: (userId, isRead, createdAt) for the bell badge
 *   - jobs: featuredUntil + geohash + (categoryId, status, createdAt)
 *   - offers: (jobId, status), (userId, status, createdAt), parentOfferId
 *   - reviews: (revieweeId, createdAt), reviewerId, jobId
 *   - token_transactions: (userId, createdAt), (type, status)
 *   - leads: (status, createdAt), (customerId, status), (category, city, status)
 *   - service_requests: (status, createdAt), (userId, status), (categoryId, status), geohash
 *   - service_request_applications: (serviceRequestId, status), (userId, status)
 *   - job_disputes: (jobId, resolutionStatus), (resolutionStatus, raisedAt)
 *
 * Uses `CREATE INDEX IF NOT EXISTS` (SQLite supports this) so it's idempotent
 * across dev (synchronize:true already added some via entity decorators) and
 * prod (synchronize:false — relies on this migration).
 */
export class AddHotColumnIndexes1747180800000 implements MigrationInterface {
  name = 'AddHotColumnIndexes1747180800000';

  public async up(qr: QueryRunner): Promise<void> {
    const stmts = [
      // bookings
      `CREATE INDEX IF NOT EXISTS idx_bookings_workerId_status_createdAt ON bookings (workerId, status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_customerId_status_createdAt ON bookings (customerId, status, createdAt)`,

      // booking_escrows
      `CREATE INDEX IF NOT EXISTS idx_booking_escrows_workerId_status ON booking_escrows (workerId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_booking_escrows_status ON booking_escrows (status)`,

      // payment_escrows
      `CREATE INDEX IF NOT EXISTS idx_payment_escrows_status ON payment_escrows (status)`,
      `CREATE INDEX IF NOT EXISTS idx_payment_escrows_taskerId_status ON payment_escrows (taskerId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_payment_escrows_paymentStatus ON payment_escrows (paymentStatus)`,

      // worker_boosts
      `CREATE INDEX IF NOT EXISTS idx_worker_boosts_status_expiresAt ON worker_boosts (status, expiresAt)`,

      // notifications
      `CREATE INDEX IF NOT EXISTS idx_notifications_userId_isRead_createdAt ON notifications (userId, isRead, createdAt)`,

      // jobs
      `CREATE INDEX IF NOT EXISTS idx_jobs_categoryId_status_createdAt ON jobs (categoryId, status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_featuredUntil ON jobs (featuredUntil)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_geohash ON jobs (geohash)`,

      // offers
      `CREATE INDEX IF NOT EXISTS idx_offers_jobId_status ON offers (jobId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_offers_userId_status_createdAt ON offers (userId, status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_offers_parentOfferId ON offers (parentOfferId)`,

      // reviews
      `CREATE INDEX IF NOT EXISTS idx_reviews_revieweeId_createdAt ON reviews (revieweeId, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_reviewerId ON reviews (reviewerId)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_jobId ON reviews (jobId)`,

      // token_transactions
      `CREATE INDEX IF NOT EXISTS idx_token_tx_userId_createdAt ON token_transactions (userId, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_token_tx_type_status ON token_transactions (type, status)`,

      // leads (JobLead)
      `CREATE INDEX IF NOT EXISTS idx_leads_status_createdAt ON leads (status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_customerId_status ON leads (customerId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_category_city_status ON leads (category, city, status)`,

      // service_requests
      `CREATE INDEX IF NOT EXISTS idx_service_requests_status_createdAt ON service_requests (status, createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_service_requests_userId_status ON service_requests (userId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_service_requests_categoryId_status ON service_requests (categoryId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_service_requests_geohash ON service_requests (geohash)`,

      // service_request_applications
      `CREATE INDEX IF NOT EXISTS idx_sr_apps_serviceRequestId_status ON service_request_applications (serviceRequestId, status)`,
      `CREATE INDEX IF NOT EXISTS idx_sr_apps_userId_status ON service_request_applications (userId, status)`,

      // job_disputes
      `CREATE INDEX IF NOT EXISTS idx_job_disputes_jobId_status ON job_disputes (jobId, resolutionStatus)`,
      `CREATE INDEX IF NOT EXISTS idx_job_disputes_status_raisedAt ON job_disputes (resolutionStatus, raisedAt)`,
    ];

    for (const sql of stmts) {
      await qr.query(sql);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const drops = [
      'idx_bookings_workerId_status_createdAt',
      'idx_bookings_customerId_status_createdAt',
      'idx_booking_escrows_workerId_status',
      'idx_booking_escrows_status',
      'idx_payment_escrows_status',
      'idx_payment_escrows_taskerId_status',
      'idx_payment_escrows_paymentStatus',
      'idx_worker_boosts_status_expiresAt',
      'idx_notifications_userId_isRead_createdAt',
      'idx_jobs_categoryId_status_createdAt',
      'idx_jobs_featuredUntil',
      'idx_jobs_geohash',
      'idx_offers_jobId_status',
      'idx_offers_userId_status_createdAt',
      'idx_offers_parentOfferId',
      'idx_reviews_revieweeId_createdAt',
      'idx_reviews_reviewerId',
      'idx_reviews_jobId',
      'idx_token_tx_userId_createdAt',
      'idx_token_tx_type_status',
      'idx_leads_status_createdAt',
      'idx_leads_customerId_status',
      'idx_leads_category_city_status',
      'idx_service_requests_status_createdAt',
      'idx_service_requests_userId_status',
      'idx_service_requests_categoryId_status',
      'idx_service_requests_geohash',
      'idx_sr_apps_serviceRequestId_status',
      'idx_sr_apps_userId_status',
      'idx_job_disputes_jobId_status',
      'idx_job_disputes_status_raisedAt',
    ];
    for (const name of drops) {
      await qr.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
