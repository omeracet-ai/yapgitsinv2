'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type CatItem = { name: string; slug: string; icon?: string };

function norm(s: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return s.toLowerCase().replace(/[çğıİöşü]/g, (c) => map[c] || c).trim();
}

function citySlug(city: string): string {
  return norm(city).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function SearchBar({
  cats,
  cities,
  localePrefix = '',
  placeholder = 'Hizmet veya şehir ara...',
  variant = 'desktop',
  onNavigate,
}: {
  cats: CatItem[];
  cities: string[];
  localePrefix?: string;
  placeholder?: string;
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const matches = useMemo(() => {
    const nq = norm(q);
    if (!nq) return { catHits: [] as CatItem[], cityHits: [] as string[], combo: null as null | { cat: CatItem; city: string } };
    const tokens = nq.split(/\s+/).filter(Boolean);

    const catHits = cats
      .filter((c) => tokens.some((t) => norm(c.name).includes(t) || c.slug.includes(t)))
      .slice(0, 5);
    const cityHits = cities
      .filter((c) => tokens.some((t) => norm(c).includes(t)))
      .slice(0, 5);

    let combo: { cat: CatItem; city: string } | null = null;
    if (catHits.length && cityHits.length) {
      combo = { cat: catHits[0], city: cityHits[0] };
    }
    return { catHits, cityHits, combo };
  }, [q, cats, cities]);

  const items: { type: 'combo' | 'cat' | 'city' | 'all'; label: string; href: string }[] = [];
  if (matches.combo) {
    items.push({
      type: 'combo',
      label: `${matches.combo.cat.name} · ${matches.combo.city}`,
      href: `${localePrefix}/${matches.combo.cat.slug}/${citySlug(matches.combo.city)}`,
    });
  }
  for (const c of matches.catHits) {
    items.push({ type: 'cat', label: c.name, href: `${localePrefix}/${c.slug}` });
  }
  for (const city of matches.cityHits) {
    // city alone → use top category if any, else search results page
    if (matches.catHits.length === 0) {
      items.push({ type: 'city', label: city, href: `${localePrefix}/ara?q=${encodeURIComponent(city)}` });
    } else {
      items.push({
        type: 'city',
        label: `${matches.catHits[0].name} · ${city}`,
        href: `${localePrefix}/${matches.catHits[0].slug}/${citySlug(city)}`,
      });
    }
  }
  if (q.trim()) {
    items.push({
      type: 'all',
      label: `"${q.trim()}" tüm sonuçlar`,
      href: `${localePrefix}/ara?q=${encodeURIComponent(q.trim())}`,
    });
  }

  function go(href: string) {
    setOpen(false);
    setQ('');
    onNavigate?.();
    router.push(href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[active]) go(items[active].href);
      else if (q.trim()) go(`${localePrefix}/ara?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const widthCls = variant === 'desktop' ? 'w-full max-w-md' : 'w-full';

  return (
    <div ref={ref} className={`relative ${widthCls}`}>
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full h-10 md:h-11 pl-10 pr-3 rounded-full bg-[var(--muted)] border border-[var(--border)] text-sm text-[var(--secondary)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--primary)] focus:bg-white"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      {open && items.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          {items.map((it, i) => (
            <button
              key={`${it.type}-${i}-${it.label}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(it.href)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                i === active ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-[var(--secondary)] hover:bg-[var(--muted)]'
              }`}
            >
              <span className="text-xs uppercase tracking-wide text-gray-400 w-12 flex-shrink-0">
                {it.type === 'combo' ? '↗' : it.type === 'cat' ? 'kat' : it.type === 'city' ? 'şehir' : 'ara'}
              </span>
              <span className="truncate">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
