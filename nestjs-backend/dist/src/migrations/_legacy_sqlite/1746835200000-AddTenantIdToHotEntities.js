"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTenantIdToHotEntities1746835200000 = void 0;
class AddTenantIdToHotEntities1746835200000 {
    name = 'AddTenantIdToHotEntities1746835200000';
    HOT_TABLES = [
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
    async up(qr) {
        for (const table of this.HOT_TABLES) {
            try {
                await qr.query(`ALTER TABLE ${table} ADD COLUMN tenantId varchar(36) NULL`);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (!/duplicate column|already exists/i.test(msg))
                    throw err;
            }
        }
        const rows = (await qr.query(`SELECT id FROM tenants WHERE slug = 'tr' LIMIT 1`));
        const defaultTenantId = rows[0]?.id;
        if (defaultTenantId) {
            for (const table of this.HOT_TABLES) {
                await qr.query(`UPDATE ${table} SET tenantId = ? WHERE tenantId IS NULL`, [defaultTenantId]);
            }
        }
        const withCreatedAt = new Set([
            'users', 'jobs', 'bookings', 'offers', 'reviews', 'chat_messages',
            'notifications', 'service_requests', 'service_request_applications',
            'job_questions', 'job_question_replies', 'favorite_workers',
            'saved_jobs', 'favorite_providers', 'blog_posts',
            'category_subscriptions', 'admin_audit_logs',
        ]);
        for (const table of this.HOT_TABLES) {
            if (withCreatedAt.has(table)) {
                await qr.query(`CREATE INDEX IF NOT EXISTS idx_${table}_tenantId_createdAt ` +
                    `ON ${table} (tenantId, createdAt)`);
            }
            else {
                await qr.query(`CREATE INDEX IF NOT EXISTS idx_${table}_tenantId ON ${table} (tenantId)`);
            }
        }
    }
    async down(qr) {
        for (const table of this.HOT_TABLES) {
            await qr.query(`DROP INDEX IF EXISTS idx_${table}_tenantId_createdAt`);
            await qr.query(`DROP INDEX IF EXISTS idx_${table}_tenantId`);
            try {
                await qr.query(`ALTER TABLE ${table} DROP COLUMN tenantId`);
            }
            catch {
            }
        }
    }
}
exports.AddTenantIdToHotEntities1746835200000 = AddTenantIdToHotEntities1746835200000;
//# sourceMappingURL=1746835200000-AddTenantIdToHotEntities.js.map