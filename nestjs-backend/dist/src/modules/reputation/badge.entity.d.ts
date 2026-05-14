import { User } from '../users/user.entity';
export type BadgeType = 'verified' | 'top_rated' | 'fast_responder' | 'reliable' | 'expert' | 'newcomer' | 'power_tasker';
export declare class Badge {
    id: string;
    tenantId: string | null;
    userId: string;
    user: User;
    badgeType: BadgeType;
    displayName: string;
    description: string | null;
    iconUrl: string | null;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    criteria: Record<string, unknown> | null;
    active: boolean;
    revokedReason: string | null;
    awardedAt: Date;
    revokedAt: Date | null;
}
