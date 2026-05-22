/**
 * Bayesian average + Wilson score utilities.
 * Re-exports from common/rating.util with array-based interface for convenience.
 */

/** Bayesian average: C=10 prior weight, m=4.0 prior mean */
export function bayesianAvg(ratings: number[], m = 4.0, C = 10): number {
  const sum = ratings.reduce((a, b) => a + b, 0);
  return (C * m + sum) / (C + ratings.length);
}

/**
 * Wilson score lower bound — confidence parametreli kanonik form (Phase 261).
 * confidence: 0.95 → z=1.96, 0.90 → z=1.645, 0.99 → z=2.576.
 */
export function wilsonScoreLowerBound(
  positive: number,
  total: number,
  confidence = 0.95,
): number {
  if (total === 0) return 0;
  const z =
    confidence >= 0.99 ? 2.576 : confidence <= 0.9 ? 1.645 : 1.96;
  const phat = positive / total;
  return (
    (phat +
      (z * z) / (2 * total) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
}

/** Wilson score lower bound (95% confidence). wilsonScoreLowerBound alias'ı. */
export function wilsonScore(positive: number, total: number): number {
  return wilsonScoreLowerBound(positive, total, 0.95);
}

/**
 * Phase 261 — Bayesian prior weight (C) dinamik kalibrasyonu.
 * Platform yorum hacmine göre 5-10 bandında C döner: hacim arttıkça shrink azalır.
 * avgReviewsPerWorker büyükse (olgun platform) C düşer (5'e yaklaşır),
 * küçükse (yeni platform, az veri) C yükselir (10'a yaklaşır = daha güçlü shrink).
 */
export function calibrateBayesianWeight(avgReviewsPerWorker: number): number {
  if (!Number.isFinite(avgReviewsPerWorker) || avgReviewsPerWorker <= 0) {
    return 10;
  }
  // 0 yorum → 10 (max shrink), 50+ yorum/usta → 5 (min shrink), lineer interpolasyon
  const c = 10 - (avgReviewsPerWorker / 50) * 5;
  return Math.max(5, Math.min(10, Math.round(c)));
}
