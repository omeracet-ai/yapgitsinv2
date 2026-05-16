import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 226 — Add `firebaseUid` to `users` (Voldi-sec).
 *
 * Social sign-in bridge: POST /auth/firebase verifies a Firebase ID token
 * and upserts a backend user. `firebaseUid` is the join key; unique so two
 * backend rows cannot collide on the same Firebase identity.
 *
 * Nullable — legacy email/password and SMS-only users keep working without
 * a value. The column is also indexed (UNIQUE implies an index in SQLite).
 *
 * Idempotent via try/catch on duplicate-column / duplicate-index errors so
 * re-running in dev (synchronize:true) or in mixed environments is safe.
 */
export class AddFirebaseUid1747353600000 implements MigrationInterface {
  name = 'AddFirebaseUid1747353600000';

  public async up(qr: QueryRunner): Promise<void> {
    try {
      await qr.query(
        `ALTER TABLE users ADD COLUMN firebaseUid varchar(128) NULL`,
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column name/i.test(msg)) throw err;
    }
    try {
      await qr.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS UQ_users_firebaseUid ` +
          `ON users (firebaseUid) WHERE firebaseUid IS NOT NULL`,
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      // Older SQLite without partial-index support: fall back to plain UNIQUE.
      if (/near \"WHERE\"|partial/i.test(msg)) {
        try {
          await qr.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS UQ_users_firebaseUid ` +
              `ON users (firebaseUid)`,
          );
        } catch (err2) {
          const m2 = (err2 as Error).message || '';
          if (!/already exists/i.test(m2)) throw err2;
        }
      } else if (!/already exists/i.test(msg)) {
        throw err;
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    try {
      await qr.query(`DROP INDEX IF EXISTS UQ_users_firebaseUid`);
    } catch {
      // ignore
    }
    try {
      await qr.query(`ALTER TABLE users DROP COLUMN firebaseUid`);
    } catch {
      // SQLite < 3.35 — column left in place is harmless.
    }
  }
}
