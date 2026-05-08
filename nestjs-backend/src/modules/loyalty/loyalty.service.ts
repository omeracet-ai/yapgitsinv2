import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const TIER_THRESHOLDS: { tier: LoyaltyTier; min: number }[] = [
  { tier: 'Bronze', min: 0 },
  { tier: 'Silver', min: 5 },
  { tier: 'Gold', min: 15 },
  { tier: 'Platinum', min: 30 },
];

export const REFERRAL_BONUS_TOKENS = 50;

export interface LoyaltyInfo {
  referralCode: string;
  tier: LoyaltyTier;
  totalSuccess: number;
  nextTier: LoyaltyTier | null;
  jobsToNextTier: number | null;
}

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AdminAuditService,
  ) {}

  private generateCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  computeLoyaltyTier(user: User): { tier: LoyaltyTier; totalSuccess: number; nextTier: LoyaltyTier | null; jobsToNextTier: number | null } {
    const totalSuccess = (user.asCustomerSuccess || 0) + (user.asWorkerSuccess || 0);
    let current: LoyaltyTier = 'Bronze';
    let nextTier: LoyaltyTier | null = null;
    let jobsToNextTier: number | null = null;
    for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
      const t = TIER_THRESHOLDS[i];
      if (totalSuccess >= t.min) current = t.tier;
    }
    const nextIdx = TIER_THRESHOLDS.findIndex((t) => totalSuccess < t.min);
    if (nextIdx > 0) {
      nextTier = TIER_THRESHOLDS[nextIdx].tier;
      jobsToNextTier = TIER_THRESHOLDS[nextIdx].min - totalSuccess;
    }
    return { tier: current, totalSuccess, nextTier, jobsToNextTier };
  }

  async getReferralCode(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.referralCode) return user.referralCode;
    // Generate unique code (retry on collision)
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = this.generateCode();
      const exists = await this.userRepo.findOne({ where: { referralCode: code } });
      if (!exists) {
        user.referralCode = code;
        await this.userRepo.save(user);
        return code;
      }
    }
    throw new BadRequestException('Referans kodu üretilemedi');
  }

  async getMyLoyalty(userId: string): Promise<LoyaltyInfo> {
    const code = await this.getReferralCode(userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const tierInfo = this.computeLoyaltyTier(user);
    return {
      referralCode: code,
      tier: tierInfo.tier,
      totalSuccess: tierInfo.totalSuccess,
      nextTier: tierInfo.nextTier,
      jobsToNextTier: tierInfo.jobsToNextTier,
    };
  }

  async redeemReferralCode(userId: string, code: string): Promise<{ success: boolean; bonusTokens: number }> {
    if (!code || typeof code !== 'string') throw new BadRequestException('Geçersiz kod');
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) throw new BadRequestException('Geçersiz kod');

    const me = await this.userRepo.findOne({ where: { id: userId } });
    if (!me) throw new NotFoundException('Kullanıcı bulunamadı');
    if (me.referredByUserId) throw new BadRequestException('Zaten bir referans kodu kullandınız');
    if (me.referralCode === normalized) throw new BadRequestException('Kendi kodunuzu kullanamazsınız');

    const referrer = await this.userRepo.findOne({ where: { referralCode: normalized } });
    if (!referrer) throw new NotFoundException('Referans kodu bulunamadı');
    if (referrer.id === me.id) throw new BadRequestException('Kendi kodunuzu kullanamazsınız');

    await this.dataSource.transaction(async (manager) => {
      me.referredByUserId = referrer.id;
      me.tokenBalance = (me.tokenBalance || 0) + REFERRAL_BONUS_TOKENS;
      referrer.tokenBalance = (referrer.tokenBalance || 0) + REFERRAL_BONUS_TOKENS;
      await manager.save(User, me);
      await manager.save(User, referrer);
    });

    // Notifications (best-effort, outside tx)
    try {
      await this.notificationsService.send({
        userId: referrer.id,
        type: NotificationType.SYSTEM,
        title: '🎁 Referansınız kullanıldı',
        body: `${me.fullName} davet kodunuzu kullandı. +${REFERRAL_BONUS_TOKENS} token kazandınız!`,
      });
      await this.notificationsService.send({
        userId: me.id,
        type: NotificationType.SYSTEM,
        title: '🎁 Hoş geldin bonusu',
        body: `Davet kodu kullanıldı. +${REFERRAL_BONUS_TOKENS} token hesabınıza eklendi.`,
      });
    } catch {
      // ignore notification failures
    }

    // Audit log
    try {
      await this.auditService.logAction(userId, 'loyalty.referral_redeem', 'user', referrer.id, {
        code: normalized,
        bonusTokens: REFERRAL_BONUS_TOKENS,
      });
    } catch {
      // ignore audit failures
    }

    return { success: true, bonusTokens: REFERRAL_BONUS_TOKENS };
  }
}
