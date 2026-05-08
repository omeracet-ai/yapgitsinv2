import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Init migration — placeholder.
 *
 * Development uses `synchronize: true` so the schema is auto-managed from entities.
 * Production should turn synchronize OFF and use migrations instead.
 *
 * To generate the real init migration against a production-like database:
 *   1. Point DB_TYPE/DB_HOST etc. at an empty target DB.
 *   2. Run: `npm run migration:generate -- src/migrations/Init`
 *   3. Delete this placeholder and commit the generated file.
 *
 * This stub exists so `migration:run` succeeds on a fresh install where
 * `synchronize: true` has already created tables — we just record a baseline.
 */
export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(_qr: QueryRunner): Promise<void> {
    // Intentionally empty — baseline marker. See file header for how to
    // replace with a generated schema for production.
  }

  public async down(_qr: QueryRunner): Promise<void> {
    // No-op
  }
}
