import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 267 — escrow simplification: 1hr grace period for plain-confirm flow.
 *
 * Adds:
 *   - payment_escrows.graceEndsAt (datetime nullable)
 *   - booking_escrows.graceEndsAt (datetime nullable)
 *
 * SQLite-compat: ADD COLUMN safe op; idempotent "already exists" tolerant.
 * No data backfill — existing rows leave graceEndsAt = NULL.
 */
export class AddGraceEndsAt1748910000000 implements MigrationInterface {
  name = 'AddGraceEndsAt1748910000000';

  private async addIfMissing(
    qr: QueryRunner,
    table: string,
    column: string,
    typeSql: string,
  ): Promise<void> {
    try {
      await qr.query(`ALTER TABLE "${table}" ADD COLUMN ${column} ${typeSql}`);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      if (/duplicate column|already exists/i.test(msg)) {
        return; // idempotent
      }
      throw err;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addIfMissing(
      queryRunner,
      'payment_escrows',
      'graceEndsAt',
      'DATETIME DEFAULT NULL',
    );
    await this.addIfMissing(
      queryRunner,
      'booking_escrows',
      'graceEndsAt',
      'DATETIME DEFAULT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite DROP COLUMN 3.35+; forward-only.
    //   ALTER TABLE payment_escrows DROP COLUMN graceEndsAt;
    //   ALTER TABLE booking_escrows DROP COLUMN graceEndsAt;
    void queryRunner;
  }
}
