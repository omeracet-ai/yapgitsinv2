import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpOtpLockout } from './ip-otp-lockout.entity';

/**
 * Phase 232 (Voldi-sec) — Cleanup cron for `ip_otp_lockouts`.
 *
 * Tablo zamanla büyür (her tekil IP bir row). 24 saat üzerinde idle ve
 * şu anda kilitli olmayan row'ları temizler. Aktif kilit altındaki
 * row'lar (`lockedUntil > now`) korunur — onlar zaten kısa süre içinde
 * lockout süresi dolunca temizlenebilir hale gelir.
 *
 * Çalışma sıklığı: her gece 03:00.
 */
@Injectable()
export class IpOtpLockoutCleanupService {
  private readonly logger = new Logger(IpOtpLockoutCleanupService.name);

  /** Idle threshold: row updatedAt'i bu süreden eski ise temizleme aday'ı. */
  private static readonly IDLE_MS = 24 * 60 * 60_000;

  constructor(
    @InjectRepository(IpOtpLockout)
    private readonly repo: Repository<IpOtpLockout>,
  ) {}

  /**
   * Cron: her gece 03:00 (yerel saat).
   * Hedef: `lockedUntil IS NULL` AND `updatedAt < now - 24h`
   * VEYA: `lockedUntil < now - 24h` (lock süresi 24h'ten önce dolmuş).
   */
  @Cron('0 3 * * *')
  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - IpOtpLockoutCleanupService.IDLE_MS);
    const cutoffIso = cutoff.toISOString();
    // Raw query — TypeORM SQLite driver `affected` field'ı her sürümde
    // tutarlı dönmüyor; raw + sayım garantili. Date binding'i ISO string'e
    // çevirip tüm driver'larda (sqlite/postgres/mysql) tutarlılık sağlanır.
    const before = await this.repo.count();
    await this.repo.query(
      `DELETE FROM ip_otp_lockouts
       WHERE ("lockedUntil" IS NULL AND "updatedAt" < ?)
          OR ("lockedUntil" IS NOT NULL AND "lockedUntil" < ?)`,
      [cutoffIso, cutoffIso],
    );
    const after = await this.repo.count();
    const affected = before - after;
    this.logger.log(`[IpOtpLockoutCleanup] removed ${affected} stale row(s)`);
    return affected;
  }

  /**
   * Manuel tetikleyici (test + admin endpoint için). Aynı mantığı çağırır.
   * E2E test'leri doğrudan bunu çağırarak cron'u beklemez.
   */
  async runNow(): Promise<number> {
    return this.cleanup();
  }
}

