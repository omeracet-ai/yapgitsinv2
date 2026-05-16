import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 231 (Voldi-sec) — DB-level per-IP OTP lockout table.
 *
 * Adds `ip_otp_lockouts` for restart-persistent multi-phone same-IP brute
 * force mitigation. Idempotent: re-runs in dev/sync environments are safe.
 *
 * SQLite + Postgres compatible (uses CREATE TABLE IF NOT EXISTS, generic
 * column types).
 */
export class AddIpOtpLockouts1747440000000 implements MigrationInterface {
  name = 'AddIpOtpLockouts1747440000000';

  public async up(qr: QueryRunner): Promise<void> {
    try {
      await qr.query(
        `CREATE TABLE IF NOT EXISTS ip_otp_lockouts (
          ip varchar(45) PRIMARY KEY,
          attempts integer NOT NULL DEFAULT 0,
          windowStartedAt datetime NOT NULL,
          lockedUntil datetime NULL,
          createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists/i.test(msg)) throw err;
    }
    try {
      await qr.query(
        `CREATE INDEX IF NOT EXISTS IDX_ip_otp_lockouts_lockedUntil ` +
          `ON ip_otp_lockouts (lockedUntil)`,
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists/i.test(msg)) throw err;
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    try {
      await qr.query(`DROP INDEX IF EXISTS IDX_ip_otp_lockouts_lockedUntil`);
    } catch {
      // ignore
    }
    try {
      await qr.query(`DROP TABLE IF EXISTS ip_otp_lockouts`);
    } catch {
      // ignore
    }
  }
}
