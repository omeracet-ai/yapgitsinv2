import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hotfix (2026-06-10) — `jobs.dueDates` ve `jobs.isDraft` sütunları.
 *
 * Phase 463 (6ea18cdf) `Job` entity'e `dueDates` (simple-json string[]),
 * Phase 464 (5f4b0003) `isDraft` (boolean) ekledi ama migration eklenmedi.
 * Prod `synchronize:false` olduğu için bu sütunlar prod DB'de yok →
 * `GET /admin/jobs` (ve diğer Job sorgulamaları) SELECT'te eksik sütun
 * üzerinden 500 dönüyor.
 *
 * Idempotent: PRAGMA table_info gate ile sütun varsa atlanır.
 */
export class AddJobDueDatesAndDraft1749200000000 implements MigrationInterface {
  name = 'AddJobDueDatesAndDraft1749200000000';

  public async up(qr: QueryRunner): Promise<void> {
    const cols = (await qr.query(`PRAGMA table_info("jobs")`)) as Array<{
      name: string;
    }>;
    const names = new Set(cols.map((c) => c.name));

    if (!names.has('dueDates')) {
      // simple-json → TEXT, nullable, default NULL
      await qr.query(
        `ALTER TABLE "jobs" ADD COLUMN "dueDates" text DEFAULT NULL`,
      );
    }

    if (!names.has('isDraft')) {
      // boolean → integer 0/1, NOT NULL with default 0 (false)
      await qr.query(
        `ALTER TABLE "jobs" ADD COLUMN "isDraft" boolean NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite no-DROP-COLUMN (CREATE-COPY-DROP gerekir). No-op.
    void qr;
  }
}
