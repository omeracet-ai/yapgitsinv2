'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDict, type Locale } from '@/i18n';

export type WorkerFilterState = {
  minRating: number;
  minRate: number | null;
  maxRate: number | null;
  verifiedOnly: boolean;
  sortBy: 'reputation' | 'rating' | 'rateAsc' | 'rateDesc';
};

export const DEFAULT_FILTERS: WorkerFilterState = {
  minRating: 0,
  minRate: null,
  maxRate: null,
  verifiedOnly: false,
  sortBy: 'reputation',
};

const RATING_CHOICES = [0, 3, 3.5, 4, 4.5];

function readFromQuery(sp: URLSearchParams): WorkerFilterState {
  return {
    minRating: Number(sp.get('minRating') ?? 0) || 0,
    minRate: sp.get('minRate') ? Number(sp.get('minRate')) : null,
    maxRate: sp.get('maxRate') ? Number(sp.get('maxRate')) : null,
    verifiedOnly: sp.get('verified') === '1',
    sortBy: (sp.get('sort') as WorkerFilterState['sortBy']) || 'reputation',
  };
}

export function countActive(f: WorkerFilterState): number {
  let n = 0;
  if (f.minRating > 0) n++;
  if (f.minRate != null) n++;
  if (f.maxRate != null) n++;
  if (f.verifiedOnly) n++;
  if (f.sortBy !== 'reputation') n++;
  return n;
}

export default function WorkerFilterSidebar({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (f: WorkerFilterState) => void;
}) {
  const dict = getDict(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<WorkerFilterState>(() =>
    readFromQuery(new URLSearchParams(searchParams?.toString() ?? '')),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    onChange(filters);
    const sp = new URLSearchParams();
    if (filters.minRating > 0) sp.set('minRating', String(filters.minRating));
    if (filters.minRate != null) sp.set('minRate', String(filters.minRate));
    if (filters.maxRate != null) sp.set('maxRate', String(filters.maxRate));
    if (filters.verifiedOnly) sp.set('verified', '1');
    if (filters.sortBy !== 'reputation') sp.set('sort', filters.sortBy);
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const reset = () => setFilters(DEFAULT_FILTERS);
  const active = countActive(filters);

  const f = ((dict as unknown as { filter?: Record<string, string> }).filter ?? {}) as Record<string, string>;
  const L = (k: string, fb: string) => f[k] ?? fb;

  const Body = (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold mb-2 text-[var(--secondary)]">
          {L('minRating', '⭐ Min Yıldız')}
        </div>
        <div className="flex flex-wrap gap-2">
          {RATING_CHOICES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilters((s) => ({ ...s, minRating: r }))}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                filters.minRating === r
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white text-gray-700 border-[var(--border)] hover:border-[var(--primary)]'
              }`}
            >
              {r === 0 ? L('any', 'Hepsi') : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2 text-[var(--secondary)]">
          {L('priceRange', '💰 Saat Ücreti (TL)')}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minRate ?? ''}
            onChange={(e) =>
              setFilters((s) => ({ ...s, minRate: e.target.value ? Number(e.target.value) : null }))
            }
            className="w-1/2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxRate ?? ''}
            onChange={(e) =>
              setFilters((s) => ({ ...s, maxRate: e.target.value ? Number(e.target.value) : null }))
            }
            className="w-1/2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          />
        </div>
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-semibold text-[var(--secondary)]">
          {L('verifiedOnly', '🛡️ Sadece Doğrulanmış')}
        </span>
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => setFilters((s) => ({ ...s, verifiedOnly: e.target.checked }))}
          className="w-5 h-5 accent-[var(--primary)]"
        />
      </label>

      <div>
        <div className="text-sm font-semibold mb-2 text-[var(--secondary)]">
          {L('sortBy', '↕️ Sıralama')}
        </div>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            setFilters((s) => ({ ...s, sortBy: e.target.value as WorkerFilterState['sortBy'] }))
          }
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
        >
          <option value="reputation">{L('sortReputation', 'İtibar')}</option>
          <option value="rating">{L('sortRating', 'Yıldız')}</option>
          <option value="rateAsc">{L('sortRateAsc', 'Ücret ↑')}</option>
          <option value="rateDesc">{L('sortRateDesc', 'Ücret ↓')}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={reset}
        className="w-full py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-gray-50"
      >
        {L('reset', 'Sıfırla')}
        {active > 0 && ` (${active})`}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-lg text-sm font-medium mb-4"
      >
        🔍 {L('filters', 'Filtreler')}
        {active > 0 && (
          <span className="bg-[var(--primary)] text-white text-xs rounded-full px-2 py-0.5">
            {active}
          </span>
        )}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[280px] flex-shrink-0">
        <div className="sticky top-20 bg-white border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--secondary)]">{L('filters', 'Filtreler')}</h3>
            {active > 0 && (
              <span className="bg-[var(--primary)] text-white text-xs rounded-full px-2 py-0.5">
                {active} {L('activeCount', 'aktif')}
              </span>
            )}
          </div>
          {Body}
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--secondary)]">{L('filters', 'Filtreler')}</h3>
              <button onClick={() => setMobileOpen(false)} className="text-2xl leading-none">×</button>
            </div>
            {Body}
            <button
              onClick={() => setMobileOpen(false)}
              className="w-full mt-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium"
            >
              {L('apply', 'Uygula')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function applyFilters<T extends {
  averageRating?: number;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  identityVerified?: boolean;
  reputationScore?: number;
}>(workers: T[], f: WorkerFilterState): T[] {
  let out = workers.filter((w) => {
    if (f.minRating > 0 && (w.averageRating ?? 0) < f.minRating) return false;
    if (f.verifiedOnly && !w.identityVerified) return false;
    if (f.minRate != null && (w.hourlyRateMax ?? w.hourlyRateMin ?? 0) < f.minRate) return false;
    if (f.maxRate != null && (w.hourlyRateMin ?? w.hourlyRateMax ?? Infinity) > f.maxRate) return false;
    return true;
  });
  out = [...out].sort((a, b) => {
    switch (f.sortBy) {
      case 'rating':
        return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      case 'rateAsc':
        return (a.hourlyRateMin ?? Infinity) - (b.hourlyRateMin ?? Infinity);
      case 'rateDesc':
        return (b.hourlyRateMin ?? 0) - (a.hourlyRateMin ?? 0);
      case 'reputation':
      default:
        return (b.reputationScore ?? 0) - (a.reputationScore ?? 0);
    }
  });
  return out;
}
