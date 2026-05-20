import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Booking → Job binding. Adds nullable `jobId` to `bookings` so bookings created
 * from an accepted offer carry their source request-job id. When such a booking
 * is completed/cancelled, BookingsService syncs the linked job's status (İşlerim
 * "Tamamlanan"/"İptal Edilen"). Direct bookings (offer→randevu) leave it null.
 *
 * Idempotent + cross-db: safeAdd swallows "duplicate column"/"already exists".
 */
export class AddBookingJobId1748600000000 implements MigrationInterface {
  name = 'AddBookingJobId1748600000000';

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
    await this.safeAdd(qr, 'bookings', 'jobId', 'varchar(36) NULL');
  }

  public async down(qr: QueryRunner): Promise<void> {
    try {
      await qr.query(`ALTER TABLE bookings DROP COLUMN jobId`);
    } catch {
      /* ignore — SQLite < 3.35 limitation or already absent */
    }
  }
}
