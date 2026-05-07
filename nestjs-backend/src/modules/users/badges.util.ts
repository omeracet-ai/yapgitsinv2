import type { User } from './user.entity';

/**
 * Airtasker-style badges.
 *
 *  Manual (admin-set, persisted in user.badges):
 *    insurance | premium | partner | verified_business
 *
 *  Computed (derived from stats, not stored):
 *    top_rated     → averageRating ≥ 4.5 AND totalReviews ≥ 5
 *    reliable      → completionRate ≥ 90% AND asWorkerTotal ≥ 5
 *    rookie        → asWorkerTotal < 3 (yeni başlayan)
 *    power_tasker  → asWorkerSuccess ≥ 50
 *    fast_responder → responseTimeMinutes && responseTimeMinutes ≤ 30
 *    blue_tick     → identityVerified === true (legacy "Mavi Tik")
 */
export type BadgeId =
  | 'insurance'
  | 'premium'
  | 'partner'
  | 'verified_business'
  | 'top_rated'
  | 'reliable'
  | 'rookie'
  | 'power_tasker'
  | 'fast_responder'
  | 'blue_tick';

export const MANUAL_BADGES: ReadonlyArray<BadgeId> = [
  'insurance',
  'premium',
  'partner',
  'verified_business',
];

export interface BadgeMeta {
  id: BadgeId;
  label: string;
  emoji: string;
  computed: boolean;
}

export const BADGE_META: Record<BadgeId, BadgeMeta> = {
  insurance:        { id: 'insurance',        label: 'Sigortalı',          emoji: '🛡️', computed: false },
  premium:          { id: 'premium',          label: 'Premium',            emoji: '👑', computed: false },
  partner:          { id: 'partner',          label: 'Yapgitsin Partner',  emoji: '🤝', computed: false },
  verified_business:{ id: 'verified_business',label: 'Doğrulanmış İşletme',emoji: '🏢', computed: false },
  top_rated:        { id: 'top_rated',        label: 'En Yüksek Puanlı',   emoji: '⭐', computed: true  },
  reliable:         { id: 'reliable',         label: 'Güvenilir',          emoji: '✅', computed: true  },
  rookie:           { id: 'rookie',           label: 'Yeni',               emoji: '🌱', computed: true  },
  power_tasker:     { id: 'power_tasker',     label: 'Süper Usta',         emoji: '🚀', computed: true  },
  fast_responder:   { id: 'fast_responder',   label: 'Hızlı Cevap Veren',  emoji: '⚡', computed: true  },
  blue_tick:        { id: 'blue_tick',        label: 'Mavi Tik',           emoji: '✓',  computed: true  },
};

/** Compute the full badge list (manual + derived) for a user. */
export function computeBadges(user: User): BadgeId[] {
  const out = new Set<BadgeId>();

  // Manual badges (admin-set)
  for (const b of user.badges ?? []) {
    if ((MANUAL_BADGES as readonly string[]).includes(b)) out.add(b as BadgeId);
  }

  // Derived
  if (user.identityVerified) out.add('blue_tick');

  if ((user.averageRating ?? 0) >= 4.5 && (user.totalReviews ?? 0) >= 5) {
    out.add('top_rated');
  }

  const total = user.asWorkerTotal ?? 0;
  const success = user.asWorkerSuccess ?? 0;
  if (total >= 5 && success / total >= 0.9) out.add('reliable');
  if (total > 0 && total < 3) out.add('rookie');
  if (success >= 50) out.add('power_tasker');

  if (user.responseTimeMinutes != null && user.responseTimeMinutes <= 30) {
    out.add('fast_responder');
  }

  return Array.from(out);
}
