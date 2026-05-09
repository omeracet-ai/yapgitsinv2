/**
 * Phase 173 — Bayesian average + Wilson score lower bound.
 *
 * Yeni ustaların tek 5★ yorum ile listenin tepesine çıkmasını engellemek için
 * iki istatistiksel düzeltici kullanırız:
 *
 * 1) Bayesian average: az veriyi global ortalamaya doğru "shrink" eder.
 *    formula: (C * m + sumRatings) / (C + count)
 *      - C = prior weight (kaç sanal ortalama-puanlı yorumun olduğu varsayılır)
 *      - m = global mean (Türkiye marketplace ortalama beklentisi)
 *
 * 2) Wilson 95% CI lower bound: pozitif (>=4★) oranın güven aralığı alt sınırı.
 *    Az örneklemde lower-bound'u düşük tutar, "top-rated" sıralaması adil olur.
 */

/**
 * Bayesian average rating.
 * @param sumRatings  Toplam yıldız (rating'lerin toplamı, 1-5 ölçeği)
 * @param count       Yorum sayısı
 * @param C           Prior weight (default 10 — 10 sanal yorumluk shrink)
 * @param m           Global mean (default 4.0)
 * @returns           0-5 arası ağırlıklı ortalama
 */
export function bayesianAverage(
  sumRatings: number,
  count: number,
  C = 10,
  m = 4.0,
): number {
  const denom = C + count;
  if (denom <= 0) return m;
  return (C * m + sumRatings) / denom;
}

/**
 * Wilson score lower bound (95% CI).
 * Rating'leri binary'ye normalize eder: rating>=4 = positive.
 * @param positive  Pozitif oy sayısı (>=4★)
 * @param total     Toplam oy sayısı
 * @param z         z-score (default 1.96 ≈ %95 CI)
 * @returns         0-1 arası alt sınır skoru
 */
export function wilsonScore(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const p = positive / total;
  const z2 = z * z;
  const num = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const den = 1 + z2 / total;
  return num / den;
}
