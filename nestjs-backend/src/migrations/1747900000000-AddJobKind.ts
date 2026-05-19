import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase Two-Sided — jobs tablosuna `kind` kolonu ekle.
 *
 * Why: Çift yönlü marketplace için 'request' (müşteri talep, mevcut) ve
 * 'offer' (usta hizmet ilanı, yeni) ayrımı. Default='request' sayesinde
 * mevcut tüm satırlar ve client'lar kırılmadan çalışır.
 *
 * Idempotent: safeAdd duplicate column hatasını yutar.
 */
export class AddJobKind1747900000000 implements MigrationInterface {
  name = 'AddJobKind1747900000000';

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
      await this.safeAdd(
        qr,
        `ALTER TABLE jobs ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'request'`,
      );
      await this.safeAdd(
        qr,
        `CREATE INDEX idx_jobs_kind_status_createdAt ON jobs(kind, status, createdAt)`,
      );
    } else if (driver === 'postgres') {
      await this.safeAdd(
        qr,
        `ALTER TABLE jobs ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'request'`,
      );
      await this.safeAdd(
        qr,
        `CREATE INDEX IF NOT EXISTS idx_jobs_kind_status_createdAt ON jobs(kind, status, "createdAt")`,
      );
    } else {
      // SQLite
      await this.safeAdd(
        qr,
        `ALTER TABLE jobs ADD COLUMN kind text NOT NULL DEFAULT 'request'`,
      );
      await this.safeAdd(
        qr,
        `CREATE INDEX IF NOT EXISTS idx_jobs_kind_status_createdAt ON jobs(kind, status, createdAt)`,
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    if (driver === 'mysql' || driver === 'mariadb') {
      await this.safeDrop(qr, `DROP INDEX idx_jobs_kind_status_createdAt ON jobs`);
      await this.safeDrop(qr, `ALTER TABLE jobs DROP COLUMN kind`);
    } else if (driver === 'postgres') {
      await this.safeDrop(qr, `DROP INDEX IF EXISTS idx_jobs_kind_status_createdAt`);
      await this.safeDrop(qr, `ALTER TABLE jobs DROP COLUMN kind`);
    } else {
      // SQLite: no-op
    }
  }
}
