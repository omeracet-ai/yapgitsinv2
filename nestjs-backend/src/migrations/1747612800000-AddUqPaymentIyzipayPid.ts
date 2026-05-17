import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 252-B (Voldi-db) — payments.iyzipayPaymentId üzerinde partial UNIQUE index.
 *
 * Why: Phase 248-FU-SEC race — iki paralel iyzipay callback aynı paymentId ile
 * gelirse code-level state guard race açığı bırakıyor. DB constraint = hard
 * guarantee.
 *
 * Partial index: iyzipayPaymentId NOT NULL satırlar için UNIQUE.
 * NULL'lar serbest (PENDING payment'lar iyzipayPaymentId=NULL ile başlar).
 *
 * Idempotent: index zaten varsa skip.
 *
 * SQLite + Postgres uyumlu (WHERE clause syntax aynı, "<col>" çift tırnak SQLite
 * tarafından da identifier quote olarak desteklenir).
 * MySQL partial index desteklemez → MySQL'de plain UNIQUE (NULL'lar MySQL'de
 * UNIQUE'i ihlal etmez, "multiple NULLs allowed").
 *
 * Eğer mevcut data'da duplicate iyzipayPaymentId varsa migration FAIL eder —
 * beklenen davranış; kullanıcı manuel temizler.
 */
export class AddUqPaymentIyzipayPid1747612800000
  implements MigrationInterface
{
  name = 'AddUqPaymentIyzipayPid1747612800000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    // Duplicate kontrolü — varsa loglayıp index oluşturmaya devam et;
    // CREATE UNIQUE INDEX zaten fail edip migration'ı durdurur.
    try {
      const dupes = await qr.query(
        `SELECT "iyzipayPaymentId", COUNT(*) as c
         FROM payments
         WHERE "iyzipayPaymentId" IS NOT NULL
         GROUP BY "iyzipayPaymentId"
         HAVING COUNT(*) > 1`,
      );
      if (Array.isArray(dupes) && dupes.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Migration AddUqPaymentIyzipayPid] ${dupes.length} duplicate iyzipayPaymentId rows detected — UNIQUE index oluşturulamayacak, manuel temizlik gerek.`,
        );
      }
    } catch {
      // table yoksa skip
    }

    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `CREATE UNIQUE INDEX uq_payment_iyzipay_pid ` +
            `ON payments (iyzipayPaymentId)`,
        );
      } else {
        // SQLite + Postgres: partial unique
        await qr.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_iyzipay_pid ` +
            `ON payments ("iyzipayPaymentId") ` +
            `WHERE "iyzipayPaymentId" IS NOT NULL`,
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
        await qr.query(`DROP INDEX uq_payment_iyzipay_pid ON payments`);
      } else {
        await qr.query(`DROP INDEX IF EXISTS uq_payment_iyzipay_pid`);
      }
    } catch {
      // ignore
    }
  }
}
