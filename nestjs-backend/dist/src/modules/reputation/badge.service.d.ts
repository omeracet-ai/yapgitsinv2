import { Repository } from 'typeorm';
import { Badge, BadgeType } from './badge.entity';
import { UsersService } from '../users/users.service';
export declare class BadgeService {
    private badgeRepo;
    private usersService;
    private readonly BADGE_DEFINITIONS;
    constructor(badgeRepo: Repository<Badge>, usersService: UsersService);
    checkAndAwardBadges(userId: string, tenantId?: string | null): Promise<Badge[]>;
    awardBadge(userId: string, badgeType: BadgeType, tenantId?: string | null): Promise<Badge>;
    revokeBadge(userId: string, badgeType: BadgeType, reason: string): Promise<void>;
    hasBadge(userId: string, badgeType: BadgeType): Promise<boolean>;
    getUserBadges(userId: string, tenantId?: string | null): Promise<Badge[]>;
    getAllBadgesMetadata(): Promise<Record<string, unknown>>;
}
