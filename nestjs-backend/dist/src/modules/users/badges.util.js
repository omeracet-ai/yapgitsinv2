"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BADGE_META = exports.ADMIN_MANUAL_BADGES = exports.MANUAL_BADGES = void 0;
exports.computeBadges = computeBadges;
exports.MANUAL_BADGES = [
    'insurance',
    'premium',
    'partner',
    'verified_business',
];
exports.ADMIN_MANUAL_BADGES = [
    'top_partner',
    'platform_pioneer',
    'community_hero',
    'vip',
];
exports.BADGE_META = {
    insurance: { id: 'insurance', label: 'Sigortalı', emoji: '🛡️', computed: false },
    premium: { id: 'premium', label: 'Premium', emoji: '👑', computed: false },
    partner: { id: 'partner', label: 'Yapgitsin Partner', emoji: '🤝', computed: false },
    verified_business: { id: 'verified_business', label: 'Doğrulanmış İşletme', emoji: '🏢', computed: false },
    top_rated: { id: 'top_rated', label: 'En Yüksek Puanlı', emoji: '⭐', computed: true },
    reliable: { id: 'reliable', label: 'Güvenilir', emoji: '✅', computed: true },
    rookie: { id: 'rookie', label: 'Yeni', emoji: '🌱', computed: true },
    power_tasker: { id: 'power_tasker', label: 'Süper Usta', emoji: '🚀', computed: true },
    fast_responder: { id: 'fast_responder', label: 'Hızlı Cevap Veren', emoji: '⚡', computed: true },
    blue_tick: { id: 'blue_tick', label: 'Mavi Tik', emoji: '✓', computed: true },
    top_partner: { id: 'top_partner', label: 'Top Partner', emoji: '🥇', computed: false },
    platform_pioneer: { id: 'platform_pioneer', label: 'Platform Öncüsü', emoji: '🚀', computed: false },
    community_hero: { id: 'community_hero', label: 'Topluluk Kahramanı', emoji: '❤️', computed: false },
    vip: { id: 'vip', label: 'VIP', emoji: '💎', computed: false },
};
function computeBadges(user) {
    const out = new Set();
    for (const b of user.badges ?? []) {
        if (exports.MANUAL_BADGES.includes(b))
            out.add(b);
    }
    for (const b of user.manualBadges ?? []) {
        if (exports.ADMIN_MANUAL_BADGES.includes(b))
            out.add(b);
    }
    if (user.identityVerified)
        out.add('blue_tick');
    if ((user.averageRating ?? 0) >= 4.5 && (user.totalReviews ?? 0) >= 5) {
        out.add('top_rated');
    }
    const total = user.asWorkerTotal ?? 0;
    const success = user.asWorkerSuccess ?? 0;
    if (total >= 5 && success / total >= 0.9)
        out.add('reliable');
    if (total > 0 && total < 3)
        out.add('rookie');
    if (success >= 50)
        out.add('power_tasker');
    if (user.responseTimeMinutes != null && user.responseTimeMinutes <= 30) {
        out.add('fast_responder');
    }
    return Array.from(out);
}
//# sourceMappingURL=badges.util.js.map