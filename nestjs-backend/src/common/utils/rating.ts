/**
 * Bayesian average + Wilson score utilities.
 * Re-exports from common/rating.util with array-based interface for convenience.
 */

/** Bayesian average: C=10 prior weight, m=4.0 prior mean */
export function bayesianAvg(ratings: number[], m = 4.0, C = 10): number {
  const sum = ratings.reduce((a, b) => a + b, 0);
  return (C * m + sum) / (C + ratings.length);
}

/** Wilson score lower bound (95% confidence) */
export function wilsonScore(positive: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96;
  const phat = positive / total;
  return (
    (phat + (z * z) / (2 * total) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
}
