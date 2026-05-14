'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = { type: 'category' | 'city' | 'worker'; label: string };

interface SearchBarProps {
  placeholder?: string;
  cats?: { name: string; slug: string; icon?: string }[];
  cities?: string[];
  localePrefix?: string;
  variant?: string;
  onNavigate?: () => void;
}

export default function SearchBar({ placeholder = 'Elektrikçi, İstanbul...', cats, cities, localePrefix, variant, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // SSR-safe: localStorage sadece client'ta okunur
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        localStorage.removeItem('recent_searches');
      }
    }
  }, []);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Öneri hesaplama
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      const lowerQ = query.toLowerCase();
      const catSuggestions = (cats || [])
        .filter((c) => c.name.toLowerCase().includes(lowerQ))
        .slice(0, 3)
        .map((c) => ({ type: 'category' as const, label: c.name }));
      const citySuggestions = (cities || [])
        .filter((c) => c.toLowerCase().includes(lowerQ))
        .slice(0, 3)
        .map((c) => ({ type: 'city' as const, label: c }));
      setSuggestions([...catSuggestions, ...citySuggestions]);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, cats, cities]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    // Duplikat yok, max 5 kayıt
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
    setIsOpen(false);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    if (onNavigate) onNavigate();
  }, [recentSearches, router, onNavigate]);

  const showDropdown = isOpen && (suggestions.length > 0 || (!query && recentSearches.length > 0));

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center bg-white border border-[var(--border)] rounded-lg px-4 py-2.5 focus-within:border-[var(--primary)]">
        <svg className="w-5 h-5 text-[var(--secondary-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          className="flex-1 ml-3 bg-transparent outline-none text-[var(--secondary)] text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(true); inputRef.current?.focus(); }}
            className="text-[var(--secondary-muted)] ml-2"
          >
            ✕
          </button>
        )}
        <button onClick={() => handleSearch(query)} className="ml-2 bg-[var(--primary)] text-white px-3 py-1 rounded-md text-sm font-medium">Ara</button>
      </div>
      {showDropdown && (
        <div className="absolute top-full mt-2 w-full bg-white border border-[var(--border)] rounded-lg shadow-lg z-[200]">
          {suggestions.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-[var(--secondary-muted)]">ÖNERILER</div>
              {suggestions.slice(0, 8).map((s, i) => (
                <button key={i} onMouseDown={(e) => { e.preventDefault(); handleSearch(s.label); }} className="w-full text-left px-4 py-2 hover:bg-[var(--primary-soft)] text-sm">
                  {s.label}
                </button>
              ))}
            </>
          )}
          {!query && recentSearches.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-[var(--secondary-muted)]">SON ARAMALAR</div>
              {recentSearches.map((s, i) => (
                <button key={i} onMouseDown={(e) => { e.preventDefault(); handleSearch(s); }} className="w-full text-left px-4 py-2 hover:bg-[var(--primary-soft)] text-sm">
                  🕐 {s}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
