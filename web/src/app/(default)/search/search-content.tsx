'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getWorkers, slugify, type Worker } from '@/lib/api';
import SearchFilters, { DEFAULT_SEARCH_FILTERS, type SearchFilterState } from '@/components/SearchFilters';
import { useSearch } from '@/hooks/useSearch';
import { localePath, type Locale, DEFAULT_LOCALE } from '@/i18n';

function parseFiltersFromURL(params: URLSearchParams): SearchFilterState & { q: string; page: number } {
  const minPriceStr = params.get('minPrice');
  const maxPriceStr = params.get('maxPrice');
  return {
    q: params.get('q') || '',
    city: params.get('city') || undefined,
    minRating: parseInt(params.get('minRating') || '0'),
    minPrice: minPriceStr ? parseInt(minPriceStr) : undefined,
    maxPrice: maxPriceStr ? parseInt(maxPriceStr) : undefined,
    verifiedOnly: params.get('verified') === '1',
    availableOnly: params.get('available') === '1',
    sortBy: (params.get('sort') as SearchFilterState['sortBy']) || 'reputation',
    page: parseInt(params.get('page') || '1'),
  };
}

function buildURLFromFilters(q: string, filters: SearchFilterState, page: number): string {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (filters.city) sp.set('city', filters.city);
  if (filters.minRating > 0) sp.set('minRating', String(filters.minRating));
  if (filters.minPrice) sp.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) sp.set('maxPrice', String(filters.maxPrice));
  if (filters.verifiedOnly) sp.set('verified', '1');
  if (filters.availableOnly) sp.set('available', '1');
  if (filters.sortBy !== 'reputation') sp.set('sort', filters.sortBy);
  if (page > 1) sp.set('page', String(page));
  return `/search?${sp.toString()}`;
}

function WorkerCardShell() {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4 h-48 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-gray-300" />
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-32 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded mb-2" />
      <div className="h-3 bg-gray-200 rounded w-32" />
    </div>
  );
}

function WorkerCard({ w, locale }: { w: Worker; locale: string }) {
  return (
    <Link
      href={localePath(locale as any, `/usta/${slugify(w.fullName || 'usta')}-${w.id}`)}
      className="block bg-white border border-[var(--border)] rounded-xl p-4 md:p-5 hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold flex-shrink-0">
          {w.fullName?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-[var(--secondary)] flex items-center gap-1">
            {w.fullName}
            {w.identityVerified && <span className="text-[var(--primary)] text-sm">✓</span>}
          </div>
          <div className="text-xs text-gray-500 truncate">{w.city || 'Tüm Türkiye'}</div>
        </div>
      </div>
      {w.workerBio && <p className="text-xs text-gray-600 line-clamp-2 mb-2">{w.workerBio}</p>}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--accent)] font-medium">★ {(w.averageRating || 0).toFixed(1)} ({w.totalReviews || 0})</span>
        {w.hourlyRateMin && <span className="text-gray-500">₺{Math.round(w.hourlyRateMin)}/sa</span>}
      </div>
    </Link>
  );
}

function SearchResultsContentInner() {
  const locale: Locale = DEFAULT_LOCALE;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const params = parseFiltersFromURL(new URLSearchParams(searchParams?.toString() ?? ''));
  const { q, page, ...filterState } = params;

  const filters: SearchFilterState = {
    city: filterState.city,
    minRating: filterState.minRating,
    minPrice: filterState.minPrice,
    maxPrice: filterState.maxPrice,
    verifiedOnly: filterState.verifiedOnly,
    availableOnly: filterState.availableOnly,
    sortBy: filterState.sortBy,
  };

  const searchResult = useSearch(workers, q, filters, page, 20);

  useEffect(() => {
    // Load all workers (cached on client)
    async function loadWorkers() {
      try {
        const resp = await getWorkers({ limit: '999' });
        if (resp) {
          // resp is either Worker[] or Paginated<Worker>
          const workers = Array.isArray(resp) ? resp : (resp.data || []);
          setWorkers(workers);
        }
      } catch (err) {
        console.error('Failed to load workers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkers();
  }, []);

  const handleFiltersChange = (newFilters: SearchFilterState) => {
    const url = buildURLFromFilters(q, newFilters, 1);
    router.push(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-[var(--border)] rounded-lg p-4 h-64 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <WorkerCardShell key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <SearchFilters filters={filters} onChange={handleFiltersChange} locale={locale} resultCount={searchResult.total} />

      <div className="flex-1 min-w-0">
        {searchResult.total === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-lg p-8 text-center">
            <div className="text-gray-500 mb-4">
              <p className="text-lg font-medium mb-2">Usta Bulunamadı</p>
              <p className="text-sm">&quot;{q}&quot; için eşleşen usta yok.</p>
              <p className="text-sm">Filtreler değiştir veya arama terimini düzenle.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              {searchResult.total} usta • Sayfa {searchResult.page} / {searchResult.pages}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
              {searchResult.paged.map((w) => (
                <WorkerCard key={w.id} w={w} locale={locale} />
              ))}
            </div>

            {searchResult.pages > 1 && (
              <div className="flex justify-center gap-2">
                {searchResult.page > 1 && (
                  <button
                    onClick={() => router.push(buildURLFromFilters(q, filters, searchResult.page - 1))}
                    className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    ← Önceki
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, searchResult.pages) }).map((_, i) => {
                    const pageNum = i + Math.max(1, searchResult.page - 2);
                    if (pageNum > searchResult.pages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => router.push(buildURLFromFilters(q, filters, pageNum))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          pageNum === searchResult.page
                            ? 'bg-[var(--primary)] text-white'
                            : 'border border-[var(--border)] hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                {searchResult.page < searchResult.pages && (
                  <button
                    onClick={() => router.push(buildURLFromFilters(q, filters, searchResult.page + 1))}
                    className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Sonraki →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsContent() {
  return (
    <Suspense fallback={<div className="h-96 bg-white rounded-lg animate-pulse" />}>
      <SearchResultsContentInner />
    </Suspense>
  );
}
