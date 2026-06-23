import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 507a — Offer entity'sine `counterCount` (integer, default 0) eklendi
 * (ilan sahibinin pazarlık hakkını 1'e sınırlamak için sayaç). Prod
 * synchronize=false olduğundan kolon manuel ALTER ile eşitlenmeli; aksi halde
 * `SELECT * FROM offers` (TypeORM eager find) SQLITE_ERROR no such column atar
 * ve ilan detayı "Teklif verenler" listesi 500 döner.
 *
 * Idempotent: PRAGMA ile varlığı kontrol et, yoksa ekle.
 */
export class Phase507AddOfferCounterCount1750000000000
  implements MigrationInterface
{
  name = 'Phase507AddOfferCounterCount1750000000000';

  public async up(qr: QueryRunner): Promise<void> {
    const cols: Array<{ name: string }> = await qr.query(
      `PRAGMA table_info('offers')`,
    );
    const names = new Set(cols.map((c) => c.name));
    if (!names.has('counterCount')) {
      await qr.query(
        `ALTER TABLE "offers" ADD COLUMN "counterCount" integer NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite < 3.35 DROP COLUMN desteklemez; zararsız NULL/0 kalır.
    void qr;
  }
}
