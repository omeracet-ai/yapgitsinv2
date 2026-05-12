/**
 * Phase 165 — Badge display information
 */
export class BadgeDto {
  id: string;
  badgeType: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  awardedAt: Date;
}
