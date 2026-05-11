'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import type { Worker } from '@/lib/api';
import { slugify } from '@/lib/api';
import { type Locale, getDict, localePath } from '@/i18n';
import WorkerFilterSidebar, {
  DEFAULT_FILTERS,
  applyFilters,
  type WorkerFilterState,
} from './WorkerFilterSidebar';

function WorkerCard({ w, locale }: { w: Worker; locale: Locale }) {
  const dict = getDict(locale);
  return (
    <Link
      href={localePath(locale, `/usta/${slugify(w.fullName || 'usta')}-${w.id}`)}
      className="block bg-white border border-[var(--border)] rounded-xl p-4 md:p-5 hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold">
          {w.fullName?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-[var(--secondary)] flex items-center gap-1">
            {w.fullName}
            {w.identityVerified && <span className="text-[var(--primary)] text-sm">✓</span>}
          </div>
          <div className="text-xs text-gray-500 truncate">{w.city || dict.common.all_turkey}</div>
        </div>
      </div>
      {w.workerBio && <p className="text-xs text-gray-600 line-clamp-2 mb-2">{w.workerBio}</p>}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--accent)] font-medium">★ {(w.averageRating || 0).toFixed(1)} ({w.totalReviews || 0})</span>
        {w.hourlyRateMin && <span className="text-gray-500">{w.hourlyRateMin}+ {dict.common.tl_per_hour}</span>}
      </div>
    </Link>
  );
}

export default function WorkerListClient({
  workers,
  locale,
  emptyText,
}: {
  workers: Worker[];
  locale: Locale;
  emptyText?: string;
}) {
  const dict = getDict(locale);
  const [filters, setFilters] = useState<WorkerFilterState>(DEFAULT_FILTERS);
  const filtered = useMemo(() => applyFilters(workers, filters), [workers, filters]);
  const empty = emptyText ?? dict.common.no_workers_in_category;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Suspense fallback={<div className="w-48 h-64 bg-gray-200 rounded-lg animate-pulse" />}>
        <WorkerFilterSidebar locale={locale} onChange={setFilters} />
      </Suspense>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-500 mb-3">
          {filtered.length} / {workers.length}
        </div>
        {filtered.length === 0 ? (
          <p className="text-gray-500">{empty}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((w) => (
              <WorkerCard key={w.id} w={w} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
