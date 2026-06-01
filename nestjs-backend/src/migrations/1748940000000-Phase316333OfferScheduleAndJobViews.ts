import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 316 + 333 — Prod schema migration.
 *
 * 1. `offers.proposedDate` (varchar 10, nullable) — usta teklifte
 *    önerdiği tarih (YYYY-MM-DD). Job.scheduleFlexibility flexible/urgent
 *    olduğunda doldurulur.
 * 2. `offers.proposedTime` (varchar 5, nullable) — usta teklifte
 *    önerdiği saat (HH:MM).
 * 3. `job_views` tablosu — IP başına günde 1 ziyaret kaydı. Unique
 *    (jobId, ipHash, viewedDate) → COUNT(*) ile unique-IP sayımı.
 *
 * Idempotent: tüm CREATE/ALTER `IF NOT EXISTS` ile.
 */
export class Phase316333OfferScheduleAndJobViews1748940000000
  implements MigrationInterface
{
  name = 'Phase316333OfferScheduleAndJobViews1748940000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ── offers: proposedDate / proposedTime ────────────────────────────
    // SQLite ALTER TABLE ADD COLUMN tek seferlik; mevcut kolonu tekrar
    // eklemek hata fırlatır → varlığı pragma ile kontrol et.
    const offersCols: Array<{ name: string }> = await qr.query(
      `PRAGMA table_info('offers')`,
    );
    const colNames = new Set(offersCols.map((c) => c.name));
    if (!colNames.has('proposedDate')) {
      await qr.query(
        `ALTER TABLE "offers" ADD COLUMN "proposedDate" varchar(10) DEFAULT NULL`,
      );
    }
    if (!colNames.has('proposedTime')) {
      await qr.query(
        `ALTER TABLE "offers" ADD COLUMN "proposedTime" varchar(5) DEFAULT NULL`,
      );
    }

    // ── job_views ──────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "job_views" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "jobId" varchar(36) NOT NULL,
        "ipHash" varchar(64) NOT NULL,
        "viewedDate" varchar(10) NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_jobviews_jobId" ON "job_views" ("jobId")`,
    );
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_jobviews_dedupe" ON "job_views" ("jobId", "ipHash", "viewedDate")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite drop column desteği <3.35 yok; production rollback bu sebeple
    // sadece job_views tablosunu sıfırlar. proposedDate/proposedTime
    // kolonları kalır (data loss yok); zararsız NULL field.
    await qr.query(`DROP TABLE IF EXISTS "job_views"`);
  }
}
