import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Voldi-review-photos-mig — Phase 212 schema catch-up.
 *
 * Why: Phase 212 added `photos` (simple-json) and `helpfulCount` (int) columns
 * to the Review entity, but no migration was ever generated. As a result
 * /users/:id/customer-profile blows up with SQLITE_ERROR: no such column
 * "Review.photos" on both local and prod.
 *
 * Idempotent: each ALTER is wrapped in a try/catch that swallows
 * "duplicate column"/"already exists" errors so a re-run on environments where
 * synchronize already added the column is a safe no-op.
 *
 * Down: SQLite has only partial DROP COLUMN support (≥3.35) and we never
 * downgrade prod-baked migrations, so SQLite branch is a no-op. MySQL/Postgres
 * drop the columns cleanly.
 */
export class AddReviewPhotos1747872000000 implements MigrationInterface {
  name = 'AddReviewPhotos1747872000000';

  private async safeAdd(qr: QueryRunner, sql: string): Promise<void> {
    try {
      await qr.query(sql);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/duplicate column|already exists/i.test(msg)) throw err;
    }
  }

  private async safeDrop(qr: QueryRunner, sql: string): Promise<void> {
    try {
      await qr.query(sql);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/no such column|does not exist|unknown column/i.test(msg)) throw err;
    }
  }

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    if (driver === 'mysql' || driver === 'mariadb') {
      await this.safeAdd(qr, `ALTER TABLE reviews ADD COLUMN photos TEXT NULL`);
      await this.safeAdd(
        qr,
        `ALTER TABLE reviews ADD COLUMN helpfulCount INT NOT NULL DEFAULT 0`,
      );
    } else if (driver === 'postgres') {
      await this.safeAdd(qr, `ALTER TABLE reviews ADD COLUMN photos TEXT NULL`);
      await this.safeAdd(
        qr,
        `ALTER TABLE reviews ADD COLUMN "helpfulCount" INTEGER NOT NULL DEFAULT 0`,
      );
    } else {
      // SQLite — simple-json is stored as TEXT by TypeORM.
      await this.safeAdd(qr, `ALTER TABLE reviews ADD COLUMN photos text NULL`);
      await this.safeAdd(
        qr,
        `ALTER TABLE reviews ADD COLUMN helpfulCount integer NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    if (driver === 'mysql' || driver === 'mariadb') {
      await this.safeDrop(qr, `ALTER TABLE reviews DROP COLUMN helpfulCount`);
      await this.safeDrop(qr, `ALTER TABLE reviews DROP COLUMN photos`);
    } else if (driver === 'postgres') {
      await this.safeDrop(qr, `ALTER TABLE reviews DROP COLUMN "helpfulCount"`);
      await this.safeDrop(qr, `ALTER TABLE reviews DROP COLUMN photos`);
    } else {
      // SQLite: no-op (DROP COLUMN partial support, we never down-migrate prod).
    }
  }
}
