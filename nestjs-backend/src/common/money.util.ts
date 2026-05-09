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
