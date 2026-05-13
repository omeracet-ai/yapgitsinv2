import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase P188/4 — Add `tokenVersion` to `users` (Voldi-sec).
 *
 * Used by the refresh-token rotation in AuthService.refresh():
 *   - Embedded in the refresh JWT payload.
 *   - Incremented atomically on each refresh; old refresh tokens carrying the
 *     previous version fail verification ⇒ 401.
 *
 * Default 0 — existing rows backfill safely without app changes (legacy refresh
 * tokens issued before this column existed simply won't carry a tokenVersion
 * claim; AuthService treats missing/zero as the initial generation).
 *
 * Idempotent via `IF NOT EXISTS` so re-running in dev (synchronize:true) or
 * across mixed environments is safe.
 */
export class AddTokenVersion1747267200000 implements MigrationInterface {
  name = 'AddTokenVersion1747267200000';

  public async up(qr: QueryRunner): Promise<void> {
    // SQLite: ALTER TABLE ... ADD COLUMN supports IF NOT EXISTS in modern builds.
    // Wrap in try/catch to keep dev (synchronize already added it) idempotent.
    try {
      await qr.query(
        `ALTER TABLE users ADD COLUMN tokenVersion integer NOT NULL DEFAULT 0`,
      );
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column name/i.test(msg)) throw err;
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    // SQLite (legacy) has no DROP COLUMN until 3.35; best-effort.
    try {
      await qr.query(`ALTER TABLE users DROP COLUMN tokenVersion`);
    } catch {
      // Ignore on older SQLite — column is harmless if left in place.
    }
  }
}
