import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 257 (Voldi-db) — Two integrity changes:
 *
 *  (a) UNIQUE partial index on `booking_escrows` preventing two *active*
 *      (held/released) escrows for the same booking. Refunded/cancelled rows are
 *      excluded so a re-hold after a refund is still allowed.
 *
 *  (b) Make `token_transactions.userId` nullable at the DB level so virtual
 *      platform/admin transactions (commission fee rows) can be inserted with a
 *      NULL owner. Mirrors the entity change (`@Column({ nullable: true })`).
 *
 * Driver matrix:
 *  (a) Unique partial index:
 *      - SQLite + Postgres : `CREATE UNIQUE INDEX ... WHERE status IN (...)`.
 *      - MySQL/MariaDB     : no partial indexes — fall back to a plain (non-unique)
 *        index, since a full UNIQUE would wrongly reject refunded/cancelled
 *        duplicates. The active-uniqueness invariant is then enforced in service
 *        code on MySQL. (Same fallback philosophy as 1748000000000.)
 *  (b) Nullable userId:
 *      - Postgres          : `ALTER TABLE ... ALTER COLUMN "userId" DROP NOT NULL`.
 *      - MySQL/MariaDB     : `ALTER TABLE ... MODIFY userId varchar(36) NULL`.
 *      - SQLite            : no-op. SQLite cannot ALTER a column's nullability in
 *        place; dev relies on synchronize to rebuild the table from the entity
 *        (which is now nullable). Existing SQLite rows already permit NULL unless
 *        the table was created NOT NULL, in which case synchronize handles it.
 *
 * Idempotent on all paths (IF NOT EXISTS / try-catch on "already exists").
 */
export class TokenTxNullableAndEscrowUnique1748400000000
  implements MigrationInterface
{
  name = 'TokenTxNullableAndEscrowUnique1748400000000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    // (a) Unique partial index on active booking escrows.
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        // No partial index — plain index only (uniqueness enforced in service).
        await qr.query(
          `CREATE INDEX uq_booking_escrows_active_bookingId ` +
            `ON booking_escrows (bookingId)`,
        );
      } else {
        await qr.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_escrows_active_bookingId ` +
            `ON booking_escrows ("bookingId") ` +
            `WHERE status IN ('held', 'released')`,
        );
      }
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }

    // (b) token_transactions.userId → nullable.
    try {
      if (driver === 'postgres') {
        await qr.query(
          `ALTER TABLE token_transactions ALTER COLUMN "userId" DROP NOT NULL`,
        );
      } else if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `ALTER TABLE token_transactions MODIFY userId varchar(36) NULL`,
        );
      }
      // SQLite: no-op — handled by synchronize in dev (see header).
    } catch (err) {
      const msg = (err as Error).message || '';
      // Postgres throws if the column is already nullable only on some versions;
      // swallow "does not exist"/idempotent re-runs defensively.
      if (!/already|does not require|cannot/i.test(msg)) {
        // Non-fatal: a fresh schema may already be nullable. Log-and-continue
        // semantics matter less here since the column default is permissive.
        throw err;
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    // (a) Drop the active-escrow index.
    try {
      if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `DROP INDEX uq_booking_escrows_active_bookingId ON booking_escrows`,
        );
      } else {
        await qr.query(
          `DROP INDEX IF EXISTS uq_booking_escrows_active_bookingId`,
        );
      }
    } catch {
      /* ignore */
    }

    // (b) Restore NOT NULL on userId (best-effort; skipped on SQLite).
    try {
      if (driver === 'postgres') {
        await qr.query(
          `ALTER TABLE token_transactions ALTER COLUMN "userId" SET NOT NULL`,
        );
      } else if (driver === 'mysql' || driver === 'mariadb') {
        await qr.query(
          `ALTER TABLE token_transactions MODIFY userId varchar(36) NOT NULL`,
        );
      }
      // SQLite: no-op.
    } catch {
      /* ignore — rows may contain NULLs that block SET NOT NULL */
    }
  }
}
