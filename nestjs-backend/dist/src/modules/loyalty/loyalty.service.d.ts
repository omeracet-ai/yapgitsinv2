import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export declare const REFERRAL_BONUS_TOKENS = 50;
export interface LoyaltyInfo {
    referralCode: string;
    tier: LoyaltyTier;
    totalSuccess: number;
    nextTier: LoyaltyTier | null;
    jobsToNextTier: number | null;
}
export declare class LoyaltyService {
    private readonly userRepo;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly auditService;
    constructor(userRepo: Repository<User>, dataSource: DataSource, notificationsService: NotificationsService, auditService: AdminAuditService);
    private generateCode;
    computeLoyaltyTier(user: User): {
        tier: LoyaltyTier;
        totalSuccess: number;
        nextTier: LoyaltyTier | null;
        jobsToNextTier: number | null;
    };
    getReferralCode(userId: string): Promise<string>;
    getMyLoyalty(userId: string): Promise<LoyaltyInfo>;
    redeemReferralCode(userId: string, code: string): Promise<{
        success: boolean;
        bonusTokens: number;
    }>;
}
