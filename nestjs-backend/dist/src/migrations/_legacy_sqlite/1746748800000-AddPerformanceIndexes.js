"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPerformanceIndexes1746748800000 = void 0;
class AddPerformanceIndexes1746748800000 {
    name = 'AddPerformanceIndexes1746748800000';
    async up(qr) {
        const stmts = [
            `CREATE INDEX IF NOT EXISTS idx_jobs_status_createdAt ON jobs (status, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_jobs_customerId_status ON jobs (customerId, status)`,
            `CREATE INDEX IF NOT EXISTS idx_jobs_deletedAt ON jobs (deletedAt)`,
            `CREATE INDEX IF NOT EXISTS idx_jobs_categoryId_status ON jobs (categoryId, status)`,
            `CREATE INDEX IF NOT EXISTS idx_offers_jobId_status ON offers (jobId, status)`,
            `CREATE INDEX IF NOT EXISTS idx_offers_userId_status ON offers (userId, status)`,
            `CREATE INDEX IF NOT EXISTS idx_bookings_customerId_date ON bookings (customerId, scheduledDate)`,
            `CREATE INDEX IF NOT EXISTS idx_bookings_workerId_date ON bookings (workerId, scheduledDate)`,
            `CREATE INDEX IF NOT EXISTS idx_bookings_status_createdAt ON bookings (status, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_notifications_userId_isRead_createdAt ON notifications (userId, isRead, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_chat_from_to_createdAt ON chat_messages ("from", "to", createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_chat_to_from_createdAt ON chat_messages ("to", "from", createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_action_createdAt ON admin_audit_logs (action, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_targetType_targetId ON admin_audit_logs (targetType, targetId)`,
            `CREATE INDEX IF NOT EXISTS idx_users_city_district_isAvailable ON users (city, district, isAvailable)`,
            `CREATE INDEX IF NOT EXISTS idx_users_isAvailable_reputation ON users (isAvailable, reputationScore)`,
            `CREATE INDEX IF NOT EXISTS idx_reviews_revieweeId_createdAt ON reviews (revieweeId, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_service_requests_status_createdAt ON service_requests (status, createdAt)`,
            `CREATE INDEX IF NOT EXISTS idx_service_requests_userId_status ON service_requests (userId, status)`,
        ];
        for (const sql of stmts) {
            await qr.query(sql);
        }
    }
    async down(qr) {
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
exports.AddPerformanceIndexes1746748800000 = AddPerformanceIndexes1746748800000;
//# sourceMappingURL=1746748800000-AddPerformanceIndexes.js.map