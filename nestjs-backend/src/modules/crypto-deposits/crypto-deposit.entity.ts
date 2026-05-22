import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum CryptoDepositStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Yatırımın amacı: jeton (Kredi) satın alma veya usta cüzdanına kredi yükleme. */
export enum CryptoDepositPurpose {
  TOKEN = 'token',
  WALLET = 'wallet',
}

/**
 * Phase 262 — USDT-TRC20 manuel yatırım talebi.
 * Kullanıcı borsadan (BTCTurk/Binance) hesap cüzdanına USDT-TRC20 gönderir,
 * TxID + tutarı girer; admin TronScan'de doğrulayıp onaylar → Kredi yüklenir.
 * Otomatik zincir doğrulaması YOK — kontrol admin'de (güvenli).
 */
@Entity('crypto_deposits')
@Index('idx_crypto_deposits_status_createdAt', ['status', 'createdAt'])
@Index('idx_crypto_deposits_userId_createdAt', ['userId', 'createdAt'])
export class CryptoDeposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  /** Ağ — şimdilik sadece TRC20 (TRON). */
  @Column({ type: 'varchar', length: 20, default: 'TRC20' })
  network: string;

  /** Varlık — şimdilik sadece USDT. */
  @Column({ type: 'varchar', length: 20, default: 'USDT' })
  asset: string;

  /** Kullanıcının gönderdiğini beyan ettiği USDT tutarı. */
  @Column({ type: 'float' })
  amountUsdt: number;

  /** TRON işlem hash'i (TxID) — admin TronScan'de doğrular. */
  @Index('idx_crypto_deposits_txId')
  @Column({ type: 'varchar', length: 100 })
  txId: string;

  /** Onaylanınca yüklenecek Kredi miktarı (kullanıcı talebi; admin onayda teyit/ayar). */
  @Column({ type: 'integer' })
  creditAmount: number;

  @Column({
    type: 'simple-enum',
    enum: CryptoDepositPurpose,
    default: CryptoDepositPurpose.TOKEN,
  })
  purpose: CryptoDepositPurpose;

  @Column({
    type: 'simple-enum',
    enum: CryptoDepositStatus,
    default: CryptoDepositStatus.PENDING,
  })
  status: CryptoDepositStatus;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewedByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;
}
