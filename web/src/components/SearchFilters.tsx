'use client';

import { useState } from 'react';
import { TR_CITIES } from '@/lib/api';
import { type Locale, getDict } from '@/i18n';

export interface SearchFilterState {
  city?: string;
  minRating: number;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly: boolean;
  availableOnly: boolean;
  sortBy: 'reputation' | 'rating' | 'priceAsc' | 'priceDesc' | 'newest';
}

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  minRating: 0,
  verifiedOnly: false,
  availableOnly: false,
  sortBy: 'reputation',
};

interface SearchFiltersProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  locale: Locale;
  resultCount?: number;
}

export default function SearchFilters({ filters, onChange, locale, resultCount }: SearchFiltersProps) {
  const dict = getDict(locale);
  const [priceMin, setPriceMin] = useState(filters.minPrice?.toString() || '');
  const [priceMax, setPriceMax] = useState(filters.maxPrice?.toString() || '');

  const handleRatingChange = (rating: number) => {
    onChange({ ...filters, minRating: rating });
  };

  const handleCityChange = (city: string) => {
    onChange({ ...filters, city: city || undefined });
  };

  const handlePriceChange = () => {
    const min = priceMin ? parseInt(priceMin) : undefined;
    const max = priceMax ? parseInt(priceMax) : undefined;
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleVerifiedChange = (checked: boolean) => {
    onChange({ ...filters, verifiedOnly: checked });
  };

  const handleAvailableChange = (checked: boolean) => {
    onChange({ ...filters, availableOnly: checked });
  };

  const handleSortChange = (sort: SearchFilterState['sortBy']) => {
    onChange({ ...filters, sortBy: sort });
  };

  const handleReset = () => {
    onChange(DEFAULT_SEARCH_FILTERS);
    setPriceMin('');
    setPriceMax('');
  };

  const activeFilters = [
    filters.city && 1,
    filters.minRating > 0 && 1,
    filters.minPrice && 1,
    filters.maxPrice && 1,
    filters.verifiedOnly && 1,
    filters.availableOnly && 1,
  ].filter(Boolean).length;

  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="bg-white border border-[var(--border)] rounded-lg p-4 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--secondary)]">Filtreler</h3>
          {activeFilters > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Sıfırla
            </button>
          )}
        </div>

        {resultCount !== undefined && (
          <div className="text-sm text-gray-600 mb-4 pb-4 border-b border-[var(--border)]">
            {resultCount} usta bulundu
          </div>
        )}

        {/* City Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--secondary)] mb-2">
            Şehir
          </label>
          <select
            value={filters.city || ''}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          >
            <option value="">Tüm şehirler</option>
            {TR_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Rating Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--secondary)] mb-2">
            Minimum Puan
          </label>
          <div className="space-y-2">
            {[0, 3, 3.5, 4, 4.5, 5].map((rating) => (
              <label key={rating} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === rating}
                  onChange={() => handleRatingChange(rating)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  {rating === 0 ? 'Herhangi' : `${rating}★ ve üzeri`}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--secondary)] mb-2">
            Saatlik Ücret (₺)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              onBlur={handlePriceChange}
              className="w-1/2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onBlur={handlePriceChange}
              className="w-1/2 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Verification Filter */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) => handleVerifiedChange(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Doğrulanmış Ustalar</span>
          </label>
        </div>

        {/* Availability Filter */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(e) => handleAvailableChange(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Müsait Olanlar</span>
          </label>
        </div>

        {/* Sort Filter */}
        <div className="mb-4 pt-4 border-t border-[var(--border)]">
          <label className="block text-sm font-medium text-[var(--secondary)] mb-2">
            Sıralama
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value as SearchFilterState['sortBy'])}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          >
            <option value="reputation">Puanına Göre</option>
            <option value="rating">Yüksek Puanlı</option>
            <option value="priceAsc">Ucuz Olanlar</option>
            <option value="priceDesc">Pahalı Olanlar</option>
            <option value="newest">En Yeni</option>
          </select>
        </div>
      </div>
    </div>
  );
}
