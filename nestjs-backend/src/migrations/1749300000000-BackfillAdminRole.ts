import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hotfix (2026-06-10) — Phase 489 (Faz J/2) RBAC backfill.
 *
 * `AddUserAdminRole1749100000000` migration `users.adminRole` sütununu açtı
 * ama DEFAULT NULL ile geldi. Mevcut admin user'ları için bu NULL kaldı.
 * `resolveRbacRole(null)` legacy fallback'i super_admin'e map ediyor olsa da
 * (rbac.config.ts §118), DB seviyesinde de explicit super_admin set ederek
 * audit/listing UI'de doğru görünmesini sağlıyoruz ve fallback'a bel bağlamayız.
 *
 * Idempotent: sadece `role='admin'` VE `adminRole IS NULL` olan satırlara dokunur.
 * Halihazırda atanmış rolleri (admin/moderator/analyst/...) overwrite ETMEZ.
 */
export class BackfillAdminRole1749300000000 implements MigrationInterface {
  name = 'BackfillAdminRole1749300000000';

  public async up(qr: QueryRunner): Promise<void> {
    // Guard: adminRole sütunu yoksa (eski DB'ler) sessizce çık —
    // AddUserAdminRole migration'ı önce çalışmış olmalı ama defansif olalım.
    const cols = (await qr.query(`PRAGMA table_info("users")`)) as Array<{
      name: string;
    }>;
    if (!cols.some((c) => c.name === 'adminRole')) {
      return;
    }
    await qr.query(
      `UPDATE "users" SET "adminRole" = 'super_admin' WHERE "role" = 'admin' AND "adminRole" IS NULL`,
    );
  }

  public async down(_qr: QueryRunner): Promise<void> {
    // No-op — geri çevirmiyoruz (legacy admin'ler super_admin kalsın).
    void _qr;
  }
}
