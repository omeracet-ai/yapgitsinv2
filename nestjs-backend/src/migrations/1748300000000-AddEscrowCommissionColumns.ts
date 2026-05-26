import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 257 (Voldi-db) — Promote boot-time `safeAdd` escrow columns into a
 * real migration so production (synchronize:false) provisions them explicitly.
 *
 * These columns were previously added only by the idempotent ADD COLUMN loop in
 * `main.ts` (Phase 174c minor-units, Phase 253 confirmation flow, Phase 254a
 * commission split). That works for SQLite dev/boot, but a fresh Postgres deploy
 * running migrations with synchronize:false would miss them. This migration is
 * the cross-db source of truth.
 *
 * Columns added (only those the entities declare):
 *   booking_escrows:
 *     - amountMinor        integer NOT NULL DEFAULT 0   (Phase 174c, kuruş — money source of truth)
 *     - confirmationStatus varchar(32) NOT NULL DEFAULT 'none' (Phase 253)
 *     - platformFeeMinor   integer NULL                 (Phase 254a)
 *     - platformFeePct     real    NULL                 (Phase 254a)
 *     - workerPayoutMinor  integer NULL                 (Phase 254a)
 *   payment_escrows:
 *     - amountMinor        integer NOT NULL DEFAULT 0   (Phase 174c, kuruş — money source of truth)
 *
 * NOTE: kuruş integer (`*Minor`) columns are the precision-safe source of truth.
 * The legacy `amount`/`platformFeeAmount` decimal/float columns are display-only
 * and are intentionally left untouched (SQLite decimal compat — see CLAUDE.md).
 *
 * Driver matrix: `safeAdd` swallows "duplicate column" / "already exists" so the
 * migration is idempotent on SQLite (where boot may have already added them),
 * Postgres, and MySQL/MariaDB. No partial indexes here, so no driver branching
 * is required for the column adds.
 *
 * Idempotent on all paths.
 */
export class AddEscrowCommissionColumns1748300000000 implements MigrationInterface {
  name = 'AddEscrowCommissionColumns1748300000000';

  private async safeAdd(
    qr: QueryRunner,
    table: string,
    column: string,
    ddl: string,
  ): Promise<void> {
    try {
      await qr.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column name|already exists/i.test(msg)) throw err;
    }
  }

  public async up(qr: QueryRunner): Promise<void> {
    // booking_escrows — minor units (Phase 174c)
    await this.safeAdd(
      qr,
      'booking_escrows',
      'amountMinor',
      'integer NOT NULL DEFAULT 0',
    );

    // booking_escrows — confirmation flow (Phase 253)
    await this.safeAdd(
      qr,
      'booking_escrows',
      'confirmationStatus',
      "varchar(32) NOT NULL DEFAULT 'none'",
    );

    // booking_escrows — commission split (Phase 254a)
    await this.safeAdd(
      qr,
      'booking_escrows',
      'platformFeeMinor',
      'integer NULL',
    );
    await this.safeAdd(qr, 'booking_escrows', 'platformFeePct', 'real NULL');
    await this.safeAdd(
      qr,
      'booking_escrows',
      'workerPayoutMinor',
      'integer NULL',
    );

    // payment_escrows — minor units (Phase 174c)
    await this.safeAdd(
      qr,
      'payment_escrows',
      'amountMinor',
      'integer NOT NULL DEFAULT 0',
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite < 3.35 has no DROP COLUMN; wrap each in try/catch so the down
    // migration is best-effort and never blocks a rollback.
    const drops: { table: string; column: string }[] = [
      { table: 'payment_escrows', column: 'amountMinor' },
      { table: 'booking_escrows', column: 'workerPayoutMinor' },
      { table: 'booking_escrows', column: 'platformFeePct' },
      { table: 'booking_escrows', column: 'platformFeeMinor' },
      { table: 'booking_escrows', column: 'confirmationStatus' },
      { table: 'booking_escrows', column: 'amountMinor' },
    ];
    for (const { table, column } of drops) {
      try {
        await qr.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
      } catch {
        /* ignore — SQLite limitation or already absent */
      }
    }
  }
}
