import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 242 (Voldi-fs) — payments.externalTransactionId üzerinde UNIQUE index.
 *
 * Webhook idempotency için DB-level garanti: aynı externalTransactionId ile
 * iki COMPLETED payment kaydı oluşturmak fiziksel olarak imkânsız.
 *
 * Partial index: externalTransactionId NOT NULL satırlar için UNIQUE.
 * NULL'lar serbest (PENDING payment'lar externalTransactionId=NULL ile başlar).
 *
 * Idempotent: index zaten varsa skip.
 *
 * SQLite + Postgres uyumlu (WHERE clause syntax aynı).
 * MySQL partial index desteklemez → MySQL'de plain UNIQUE (NULL'lar MySQL'de
 * UNIQUE'i ihlal etmez, "multiple NULLs allowed").
 */
export class AddPaymentsExternalTxIdUnique1747526400000
  implements MigrationInterface
{
  name = 'AddPaymentsExternalTxIdUnique1747526400000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    // Önce duplicate NULL-olmayan değerleri tespit et — varsa migration güvenli
    // değil; ama prod'da bu kolon Phase 241'e kadar bir webhook ile yazılıyor
    // ve yeni constraint öncesi mevcut data temiz olmalı. Sadece warn'la geç.
    try {
      const dupes = await qr.query(
        `SELECT "externalTransactionId", COUNT(*) as c
         FROM payments
         WHERE "externalTransactionId" IS NOT NULL
         GROUP BY "externalTransactionId"
         HAVING COUNT(*) > 1`,
      );
      if (Array.isArray(dupes) && dupes.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Migration AddPaymentsExternalTxIdUnique] ${dupes.length} duplicate externalTransactionId rows detected — UNIQUE index oluşturulamayabilir.`,
        );
      }
    } catch {
      // table yoksa skip (cold-start sync ortamı)
    }

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `CREATE UNIQUE INDEX UQ_payments_externalTransactionId ` +
            `ON payments (externalTransactionId)`,
        );
      } else {
        // SQLite + Postgres: partial unique
        await qr.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS UQ_payments_externalTransactionId ` +
            `ON payments ("externalTransactionId") ` +
            `WHERE "externalTransactionId" IS NOT NULL`,
        );
      }
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `DROP INDEX UQ_payments_externalTransactionId ON payments`,
        );
      } else {
        await qr.query(
          `DROP INDEX IF EXISTS UQ_payments_externalTransactionId`,
        );
      }
    } catch {
      // ignore
    }
  }
}
