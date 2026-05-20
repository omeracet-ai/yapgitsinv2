import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 256 (Voldi-db) — KVKK Compliance.
 *
 * Creates the `user_consents` table — an immutable, append-only log of each
 * user's acceptance (and optional later revocation) of a consent type/version.
 *
 *   - id           uuid PK
 *   - userId       varchar(36)  — owner (indexed)
 *   - consentType  varchar(32)  — 'kvkk' | 'terms' | 'marketing'
 *   - version      varchar(32)  — e.g. 'v1.0'
 *   - acceptedAt   datetime     — NOT NULL (set at insert time)
 *   - revokedAt    datetime     — nullable
 *   - ipAddress    varchar(64)  — nullable, request IP at accept time
 *   - userAgent    varchar(512) — nullable, request UA at accept time
 *
 * Voldi-fs (auth.service) INSERTs rows at register; Voldi-fs (users.service)
 * reads / sets revokedAt. This migration only provisions the schema.
 *
 * Index:
 *   - `idx_user_consents_user_type_revoked` on (userId, consentType, revokedAt)
 *      — fast "does this user have an active consent of type X?" lookups.
 *
 * Driver matrix:
 *   - SQLite + Postgres + MySQL/MariaDB : `CREATE TABLE IF NOT EXISTS` +
 *     `CREATE INDEX IF NOT EXISTS` are all supported.
 *   - `datetime` maps cleanly across SQLite/MySQL; Postgres treats it as
 *     `timestamp` (TypeORM column type 'datetime' resolves per-driver in the
 *     entity, the raw DDL here uses `datetime` which Postgres accepts as an
 *     alias for `timestamp without time zone`).
 *
 * Idempotent: re-running is a no-op (hasTable guard + IF NOT EXISTS).
 */
export class CreateUserConsents1748200000000 implements MigrationInterface {
  name = 'CreateUserConsents1748200000000';

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;

    const hasTable = await qr.hasTable('user_consents');
    if (!hasTable) {
      // Postgres uses `uuid`/`timestamp`; everyone else gets varchar/datetime.
      const isPg = driver === 'postgres';
      const idType = isPg ? 'uuid' : 'varchar(36)';
      const dtType = isPg ? 'timestamp' : 'datetime';

      await qr.query(
        `CREATE TABLE IF NOT EXISTS user_consents (
          id ${idType} NOT NULL PRIMARY KEY,
          "userId" varchar(36) NOT NULL,
          "consentType" varchar(32) NOT NULL,
          version varchar(32) NOT NULL,
          "acceptedAt" ${dtType} NOT NULL,
          "revokedAt" ${dtType} NULL,
          "ipAddress" varchar(64) NULL,
          "userAgent" varchar(512) NULL
        )`,
      );
    }

    try {
      await qr.query(
        `CREATE INDEX IF NOT EXISTS idx_user_consents_user_type_revoked ` +
          `ON user_consents ("userId", "consentType", "revokedAt")`,
      );
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
          `DROP INDEX idx_user_consents_user_type_revoked ON user_consents`,
        );
      } else {
        await qr.query(
          `DROP INDEX IF EXISTS idx_user_consents_user_type_revoked`,
        );
      }
    } catch {
      /* ignore */
    }

    try {
      await qr.query(`DROP TABLE IF EXISTS user_consents`);
    } catch {
      /* ignore */
    }
  }
}
