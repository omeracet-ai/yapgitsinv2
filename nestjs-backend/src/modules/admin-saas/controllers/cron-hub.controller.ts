import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';

/**
 * M9 — Cron Hub.
 * Read-only catalog of cron jobs running via @nestjs/schedule decorators.
 * Used for admin onboarding / visibility — not for external scheduler URLs.
 */
export interface CronJobInfo {
  name: string;
  description: string;
  schedule: string;
  schedulePretty: string;
  module: string;
  category: 'cleanup' | 'reminder' | 'expiry' | 'sync' | 'health';
  internal: boolean;
}

const CRON_CATALOG: CronJobInfo[] = [
  {
    name: 'booking-reminder',
    description: 'Yaklaşan randevular için müşteri/usta hatırlatma bildirimi',
    schedule: 'EVERY_30_MINUTES',
    schedulePretty: 'Her 30 dakikada',
    module: 'cron/booking-reminder.service',
    category: 'reminder',
    internal: true,
  },
  {
    name: 'boost-expiry',
    description: 'Süresi dolan ilan boostlarını pasifleştirir',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'cron/boost-expiry.service',
    category: 'expiry',
    internal: true,
  },
  {
    name: 'worker-boost-expiry',
    description: 'Süresi dolan usta öne çıkarma kayıtlarını temizler',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'cron/worker-boost-expiry.service',
    category: 'expiry',
    internal: true,
  },
  {
    name: 'review-reminder-10min',
    description: 'Tamamlanmış iş için 10dk sonra yorum hatırlatması',
    schedule: 'EVERY_MINUTE',
    schedulePretty: 'Her dakika',
    module: 'cron/review-reminder.service',
    category: 'reminder',
    internal: true,
  },
  {
    name: 'review-reminder-hourly',
    description: 'Saatlik yorum hatırlatma turu (24h, 72h)',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'cron/review-reminder.service',
    category: 'reminder',
    internal: true,
  },
  {
    name: 'saved-search-alert',
    description: 'Kullanıcının kaydettiği arama için yeni iş bildirimi',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'cron/saved-search-alert.service',
    category: 'sync',
    internal: true,
  },
  {
    name: 'bot-protection-cleanup',
    description: 'Süresi dolmuş IP block kayıtlarını temizler',
    schedule: '30 3 * * *',
    schedulePretty: 'Her gün 03:30',
    module: 'cron/bot-protection-cleanup.service',
    category: 'cleanup',
    internal: true,
  },
  {
    name: 'ip-otp-lockout-cleanup',
    description: 'OTP brute-force kilit kayıtlarını temizler',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'auth/ip-otp-lockout-cleanup.service',
    category: 'cleanup',
    internal: true,
  },
  {
    name: 'escrow-confirmation-timeout',
    description: 'Escrow onay penceresi dolan kayıtları otomatik kapatır',
    schedule: 'EVERY_HOUR',
    schedulePretty: 'Her saat başı',
    module: 'escrow/escrow-confirmation-timeout.service',
    category: 'expiry',
    internal: true,
  },
  {
    name: 'users-cleanup',
    description: 'Silinmesi gereken kullanıcı verilerini günlük temizler',
    schedule: '0 4 * * *',
    schedulePretty: 'Her gün 04:00',
    module: 'users/users-cleanup.task',
    category: 'cleanup',
    internal: true,
  },
  {
    name: 'message-log-purge',
    description: '30 günden eski mesaj loglarını siler (M8 SaaS)',
    schedule: '0 3 * * *',
    schedulePretty: 'Her gün 03:00',
    module: 'admin-saas/message-log.service',
    category: 'cleanup',
    internal: true,
  },
];

@Controller('admin/cron-hub')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class CronHubController {
  @Get()
  list(): { items: CronJobInfo[]; total: number; categories: string[] } {
    const categories = Array.from(
      new Set(CRON_CATALOG.map((c) => c.category)),
    );
    return {
      items: CRON_CATALOG,
      total: CRON_CATALOG.length,
      categories,
    };
  }
}
