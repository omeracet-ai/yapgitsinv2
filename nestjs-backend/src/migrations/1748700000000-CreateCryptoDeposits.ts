import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 262 — `crypto_deposits` tablosu (USDT-TRC20 manuel yatırım talepleri).
 *
 * Kullanıcı borsadan hesap cüzdanına USDT-TRC20 gönderir, TxID + tutar girer;
 * admin doğrulayıp onaylar → Kredi yüklenir. synchronize:false prod'da bu tablo
 * migration ile oluşturulmalı.
 *
 * Kolonlar src/modules/crypto-deposits/crypto-deposit.entity.ts ile birebir.
 * Driver matrisi: Postgres uuid+timestamp; diğerleri varchar(36)+datetime.
 */
export class CreateCryptoDeposits1748700000000 implements MigrationInterface {
  name = 'CreateCryptoDeposits1748700000000';

  private async safeIndex(qr: QueryRunner, ddl: string): Promise<void> {
    try {
      await qr.query(ddl);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!/already exists|duplicate key name/i.test(msg)) throw err;
    }
  }

  public async up(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    const isPg = driver === 'postgres';
    const idType = isPg ? 'uuid' : 'varchar(36)';
    const dtType = isPg ? 'timestamp' : 'datetime';
    const nowDefault = isPg ? 'now()' : 'CURRENT_TIMESTAMP';

    const hasTable = await qr.hasTable('crypto_deposits');
    if (!hasTable) {
      await qr.query(
        `CREATE TABLE IF NOT EXISTS crypto_deposits (
          id ${idType} NOT NULL PRIMARY KEY,
          "tenantId" varchar(36) NULL,
          "userId" varchar(36) NOT NULL,
          network varchar(20) NOT NULL DEFAULT 'TRC20',
          asset varchar(20) NOT NULL DEFAULT 'USDT',
          "amountUsdt" float NOT NULL,
          "txId" varchar(100) NOT NULL,
          "creditAmount" integer NOT NULL,
          purpose varchar(20) NOT NULL DEFAULT 'token',
          status varchar(20) NOT NULL DEFAULT 'pending',
          "adminNote" text NULL,
          "reviewedByAdminId" varchar(36) NULL,
          "createdAt" ${dtType} NOT NULL DEFAULT ${nowDefault},
          "reviewedAt" ${dtType} NULL
        )`,
      );
    }

    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status_createdAt ON crypto_deposits (status, "createdAt")`,
    );
    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_crypto_deposits_userId_createdAt ON crypto_deposits ("userId", "createdAt")`,
    );
    await this.safeIndex(
      qr,
      `CREATE INDEX IF NOT EXISTS idx_crypto_deposits_txId ON crypto_deposits ("txId")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    const driver = qr.connection.options.type;
    const isMysql = driver === 'mysql' || driver === 'mariadb';
    const indexes = [
      'idx_crypto_deposits_txId',
      'idx_crypto_deposits_userId_createdAt',
      'idx_crypto_deposits_status_createdAt',
    ];
    for (const idx of indexes) {
      try {
        if (isMysql) {
          await qr.query(`DROP INDEX \`${idx}\` ON crypto_deposits`);
        } else {
          await qr.query(`DROP INDEX IF EXISTS "${idx}"`);
        }
      } catch {
        /* ignore */
      }
    }
    try {
      await qr.query(`DROP TABLE IF EXISTS crypto_deposits`);
    } catch {
      /* ignore */
    }
  }
}
