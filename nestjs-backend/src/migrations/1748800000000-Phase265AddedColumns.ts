import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 265 + 265b + 265c + 263 + 264 — single migration for all entity
 * changes added between commits 0ce2b50c..026e1308.
 *
 * Added columns:
 *   - users.workerDocuments     (simple-json / TEXT, nullable)   [Phase 263]
 *   - users.featuredOrder       (integer, nullable, default null) [Phase 264]
 *   - jobs.targetWorkerId       (varchar 36, nullable, default null) [Phase 265]
 *   - jobs.scheduleFlexibility  (varchar 16, default 'flexible')  [Phase 265b]
 *   - offers.refreshCount       (integer, default 0)              [Phase 265c]
 *   - offers.refreshedAt        (timestamp, nullable, default null) [Phase 265c]
 *
 * SQLite-compat: hepsi ADD COLUMN (safe op). Diğer DB sürücülerinde de aynı
 * SQL çalışır. "column already exists" toleranslı.
 */
export class Phase265AddedColumns1748800000000 implements MigrationInterface {
  name = 'Phase265AddedColumns1748800000000';

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
        // idempotent — already added, skip
        return;
      }
      throw err;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users: workerDocuments (Phase 263 — simple-json stored as TEXT)
    await this.addIfMissing(queryRunner, 'users', 'workerDocuments', 'TEXT');
    // ── users: featuredOrder (Phase 264)
    await this.addIfMissing(
      queryRunner,
      'users',
      'featuredOrder',
      'INTEGER DEFAULT NULL',
    );
    // ── jobs: targetWorkerId (Phase 265)
    await this.addIfMissing(
      queryRunner,
      'jobs',
      'targetWorkerId',
      "VARCHAR(36) DEFAULT NULL",
    );
    // ── jobs: scheduleFlexibility (Phase 265b)
    await this.addIfMissing(
      queryRunner,
      'jobs',
      'scheduleFlexibility',
      "VARCHAR(16) DEFAULT 'flexible'",
    );
    // ── offers: refreshCount + refreshedAt (Phase 265c)
    await this.addIfMissing(
      queryRunner,
      'offers',
      'refreshCount',
      'INTEGER DEFAULT 0',
    );
    await this.addIfMissing(
      queryRunner,
      'offers',
      'refreshedAt',
      'TIMESTAMP DEFAULT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite DROP COLUMN 3.35+ gerekir; broad-compat için no-op (forward-only).
    // PG/MariaDB için manuel rollback:
    //   ALTER TABLE users  DROP COLUMN workerDocuments;
    //   ALTER TABLE users  DROP COLUMN featuredOrder;
    //   ALTER TABLE jobs   DROP COLUMN targetWorkerId;
    //   ALTER TABLE jobs   DROP COLUMN scheduleFlexibility;
    //   ALTER TABLE offers DROP COLUMN refreshCount;
    //   ALTER TABLE offers DROP COLUMN refreshedAt;
    void queryRunner;
  }
}
