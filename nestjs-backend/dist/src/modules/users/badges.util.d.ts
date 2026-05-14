import type { User } from './user.entity';
export type BadgeId = 'insurance' | 'premium' | 'partner' | 'verified_business' | 'top_rated' | 'reliable' | 'rookie' | 'power_tasker' | 'fast_responder' | 'blue_tick' | 'top_partner' | 'platform_pioneer' | 'community_hero' | 'vip';
export declare const MANUAL_BADGES: ReadonlyArray<BadgeId>;
export declare const ADMIN_MANUAL_BADGES: ReadonlyArray<BadgeId>;
export interface BadgeMeta {
    id: BadgeId;
    label: string;
    emoji: string;
    computed: boolean;
}
export declare const BADGE_META: Record<BadgeId, BadgeMeta>;
export declare function computeBadges(user: User): BadgeId[];
