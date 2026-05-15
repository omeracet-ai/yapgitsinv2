/**
 * Phase 195 — Token (jeton) satın alma paketleri.
 *
 * Tek kaynak (single source of truth) — Flutter UI bu listeyi
 * `GET /tokens/packages` üzerinden çeker, hardcode ETMEZ.
 *
 * `priceMinor` = TL'nin kuruş (1/100) cinsi — IEEE 754 float drift'i yok.
 * Yapgitsin reputation/para integer politikasıyla uyumlu.
 */

export interface TokenPackage {
  /** Stable id — DB ref, log, analytics. */
  id: string;
  /** Kullanıcıya gösterilen ad. */
  label: string;
  /** Verilecek jeton miktarı. */
  tokens: number;
  /** Ödeme tutarı, kuruş. (100 TL = 10000) */
  priceMinor: number;
  /** Etiket — "En Popüler", "%20 Bonus" vb. (opsiyonel) */
  badge?: string;
}

export const TOKEN_PACKAGES: readonly TokenPackage[] = Object.freeze([
  { id: 'pkg_100', label: '100 Jeton', tokens: 100, priceMinor: 9900 },
  {
    id: 'pkg_250',
    label: '250 Jeton',
    tokens: 250,
    priceMinor: 22900,
    badge: 'En Popüler',
  },
  {
    id: 'pkg_500',
    label: '500 Jeton',
    tokens: 500,
    priceMinor: 42900,
    badge: '%14 Bonus',
  },
  {
    id: 'pkg_1000',
    label: '1000 Jeton',
    tokens: 1000,
    priceMinor: 79900,
    badge: '%20 Bonus',
  },
]);

export function findPackage(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === id);
}
