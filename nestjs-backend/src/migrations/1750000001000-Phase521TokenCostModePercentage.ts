import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 521 — Token cost mode flat → percent (CRITICAL fix).
 *
 * Sorun: prod canlısında `app_settings.offerTokenCostMode = 'flat'` ile yazılmış
 * (eski sürüm seed). Phase 510a/b/c "%-of-budget" ekonomisi tamamlanmış olsa da
 * mod flat olduğundan teklif maliyeti sabit `offerTokenCost` (=5) olarak
 * düşülüyor; min/max bound'ları ve bütçe-orantılı hesap devre dışı kalıyor.
 *
 * Idempotent: yalnızca `mode='flat' AND offerTokenCostMin > 0 AND
 * offerTokenCostMax >= offerTokenCostMin` koşulu sağlanan satır(lar)ı
 * `'percent'`'e flip eder. Admin tekrar `flat`'a almak isterse UI'dan geri
 * alabilir; bu migration tek seferlik flip'tir.
 *
 * `value` sütun adıyla doğrudan UPDATE yerine subquery + EXISTS guard
 * kullanıyoruz; böylece offerTokenCostMin/Max satırları yoksa flip yapılmaz
 * (bozuk state'e geçişi engeller).
 */
export class Phase521TokenCostModePercentage1750000001000
  implements MigrationInterface
{
  name = 'Phase521TokenCostModePercentage1750000001000';

  public async up(qr: QueryRunner): Promise<void> {
    // Önce gerekli satırların var olduğundan emin ol.
    const modeRow: Array<{ value: string }> = await qr.query(
      `SELECT value FROM app_settings WHERE key = 'offerTokenCostMode'`,
    );
    if (!modeRow.length) return; // seed daha çalışmamış — bırak, seedSettings halleder.
    if (modeRow[0].value !== 'flat') return; // zaten percent — no-op.

    const minRow: Array<{ value: string }> = await qr.query(
      `SELECT value FROM app_settings WHERE key = 'offerTokenCostMin'`,
    );
    const maxRow: Array<{ value: string }> = await qr.query(
      `SELECT value FROM app_settings WHERE key = 'offerTokenCostMax'`,
    );
    const min = minRow.length ? Number(minRow[0].value) : NaN;
    const max = maxRow.length ? Number(maxRow[0].value) : NaN;
    if (!Number.isFinite(min) || min <= 0) return;
    if (!Number.isFinite(max) || max < min) return;

    await qr.query(
      `UPDATE app_settings SET value = 'percent' WHERE key = 'offerTokenCostMode' AND value = 'flat'`,
    );

    // Phase 510 spec'i: percent value default %1 ama eski flat=5 kalmış olabilir.
    // Eğer offerTokenCost > 10 (yani flat kredi sayısı gibi yazılmış) ise %1'e çek.
    const valRow: Array<{ value: string }> = await qr.query(
      `SELECT value FROM app_settings WHERE key = 'offerTokenCost'`,
    );
    if (valRow.length) {
      const v = Number(valRow[0].value);
      if (Number.isFinite(v) && v > 10) {
        // 10'dan büyük = eski flat değeri. Percent için %1'e (spec default) düşür.
        await qr.query(
          `UPDATE app_settings SET value = '1' WHERE key = 'offerTokenCost'`,
        );
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // No-op: geri dönüş manuel admin işidir, bu migration tek yönlü.
    void qr;
  }
}
