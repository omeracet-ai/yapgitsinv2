import { useMemo } from 'react';
import type { Worker } from '@/lib/api';
import type { SearchFilterState } from '@/components/SearchFilters';

interface UseSearchResult {
  filtered: Worker[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  paged: Worker[];
}

export function useSearch(
  workers: Worker[],
  query: string,
  filters: SearchFilterState,
  page: number = 1,
  pageSize: number = 20,
): UseSearchResult {
  const filtered = useMemo(() => {
    let result = workers;

    // Text search: fullName, workerBio, categories
    if (query.trim()) {
      const lowerQ = query.toLowerCase();
      result = result.filter(
        (w) =>
          (w.fullName?.toLowerCase().includes(lowerQ) ?? false) ||
          (w.workerBio?.toLowerCase().includes(lowerQ) ?? false) ||
          (w.workerCategories?.some((c) => c.toLowerCase().includes(lowerQ)) ?? false),
      );
    }

    // City filter
    if (filters.city) {
      result = result.filter((w) => w.city === filters.city);
    }

    // Rating filter
    if (filters.minRating > 0) {
      result = result.filter((w) => (w.averageRating ?? 0) >= filters.minRating);
    }

    // Price filter
    if (filters.minPrice !== undefined) {
      const minPrice = filters.minPrice;
      result = result.filter((w) => (w.hourlyRateMin ?? 0) >= minPrice);
    }
    if (filters.maxPrice !== undefined) {
      const maxPrice = filters.maxPrice;
      result = result.filter((w) => (w.hourlyRateMax ?? Infinity) <= maxPrice);
    }

    // Verification filter
    if (filters.verifiedOnly) {
      result = result.filter((w) => w.identityVerified);
    }

    // Availability filter
    if (filters.availableOnly) {
      result = result.filter((w) => w.isAvailable);
    }

    // Sorting
    if (filters.sortBy === 'rating') {
      result.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    } else if (filters.sortBy === 'priceAsc') {
      result.sort((a, b) => (a.hourlyRateMin ?? 0) - (b.hourlyRateMin ?? 0));
    } else if (filters.sortBy === 'priceDesc') {
      result.sort((a, b) => (b.hourlyRateMax ?? 0) - (a.hourlyRateMax ?? 0));
    } else if (filters.sortBy === 'newest') {
      result.sort((a, b) => {
        const aTime = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const bTime = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return bTime - aTime;
      });
    } else {
      // reputation (default) - sort by averageRating (wilsonScore not in API)
      result.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || (b.reputationScore ?? 0) - (a.reputationScore ?? 0));
    }

    return result;
  }, [workers, query, filters]);

  const total = filtered.length;
  const pages = Math.ceil(total / pageSize);
  const validPage = Math.max(1, Math.min(page, pages || 1));
  const paged = filtered.slice((validPage - 1) * pageSize, validPage * pageSize);

  return {
    filtered,
    total,
    page: validPage,
    pageSize,
    pages,
    paged,
  };
}
