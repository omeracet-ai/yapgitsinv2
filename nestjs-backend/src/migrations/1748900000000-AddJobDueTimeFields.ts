import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 266 — jobs.dueTime + jobs.dueAnyTime
 *
 * Added columns:
 *   - jobs.dueTime    (varchar 5, nullable, default null) — HH:MM
 *   - jobs.dueAnyTime (boolean, default 0)               — "Tüm saatler" toggle
 *
 * SQLite-compat: ADD COLUMN safe op; idempotent "already exists" toleranslı.
 */
export class AddJobDueTimeFields1748900000000 implements MigrationInterface {
  name = 'AddJobDueTimeFields1748900000000';

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
      'jobs',
      'dueTime',
      'VARCHAR(5) DEFAULT NULL',
    );
    await this.addIfMissing(
      queryRunner,
      'jobs',
      'dueAnyTime',
      'BOOLEAN DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite DROP COLUMN 3.35+; forward-only.
    // PG/MariaDB manuel rollback:
    //   ALTER TABLE jobs DROP COLUMN dueTime;
    //   ALTER TABLE jobs DROP COLUMN dueAnyTime;
    void queryRunner;
  }
}
