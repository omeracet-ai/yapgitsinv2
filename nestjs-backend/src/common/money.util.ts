export const MONEY_SCALE = 100;

export function tlToMinor(tl: number | null | undefined): number | null {
  if (tl === null || tl === undefined) return null;
  return Math.round(tl * MONEY_SCALE);
}

export function minorToTl(minor: number | null | undefined): number | null {
  if (minor === null || minor === undefined) return null;
  return minor / MONEY_SCALE;
}

export function formatMinor(minor: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(minor / MONEY_SCALE);
}

export function addMinor(...vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0);
}

export function subMinor(a: number, b: number): number {
  return a - b;
}

export function pctOfMinor(minor: number, pct: number): number {
  return Math.round((minor * pct) / 100);
}

/**
 * Phase 524 — Token balance consistency helper.
 *
 * Tarihsel olarak `tokenBalance` (float) yasal/eski alandı; Phase 174'te
 * `tokenBalanceMinor` (integer kuruş) eklendi. Boot-time backfill
 * `tokenBalanceMinor = ROUND(tokenBalance * 100)` ile senkronladı, fakat
 * sonraki spend/refund yazımları arada drift bırakabiliyor (özellikle minor
 * yazılıp legacy `tokenBalance` 0'a düşmüş kullanıcılar için).
 *
 * Bu helper iki kaynağın `floor(tokenBalanceMinor/100)` ve `tokenBalance`
 * max'ını döner — kullanıcı yanıtında her zaman pozitif olan kaynağı yansıt,
 * Flutter "yetersiz bakiye" hatası alma.
 */
export function effectiveTokenBalance(user: {
  tokenBalance?: number | null;
  tokenBalanceMinor?: number | null;
}): number {
  const legacy = Number(user?.tokenBalance ?? 0);
  const minor = Number(user?.tokenBalanceMinor ?? 0);
  const fromMinor = Number.isFinite(minor) ? Math.floor(minor / 100) : 0;
  const fromLegacy = Number.isFinite(legacy) ? Math.floor(legacy) : 0;
  return Math.max(fromLegacy, fromMinor, 0);
}
