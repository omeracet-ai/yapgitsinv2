'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type CatItem = { name: string; slug: string; icon?: string };

function norm(s: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return s.toLowerCase().replace(/[çğıİöşü]/g, (c) => map[c] || c).trim();
}
function citySlug(c: string): string {
  return norm(c).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function Inner({
  cats,
  cities,
  localePrefix,
  labels,
}: {
  cats: CatItem[];
  cities: string[];
  localePrefix: string;
  labels: { categories: string; cities: string; empty: string; query: string };
}) {
  const params = useSearchParams();
  const q = (params.get('q') || '').trim();
  const nq = norm(q);
  const tokens = nq.split(/\s+/).filter(Boolean);

  const matchedCats = tokens.length
    ? cats.filter((c) => tokens.some((t) => norm(c.name).includes(t) || c.slug.includes(t)))
    : [];
  const matchedCities = tokens.length
    ? cities.filter((c) => tokens.some((t) => norm(c).includes(t)))
    : [];
  const hasResults = matchedCats.length > 0 || matchedCities.length > 0;

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-6 leading-tight">
        {q ? `"${q}"` : labels.query}
      </h1>
      {q && !hasResults && <p className="text-gray-500 mb-8">{labels.empty}</p>}
      {matchedCats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[var(--secondary)] mb-3">{labels.categories}</h2>
          <div className="flex flex-wrap gap-2">
            {matchedCats.map((c) => (
              <Link
                key={c.slug}
                href={`${localePrefix}/${c.slug}`}
                className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {matchedCities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[var(--secondary)] mb-3">{labels.cities}</h2>
          <div className="flex flex-wrap gap-2">
            {matchedCities.flatMap((city) =>
              (matchedCats.length ? matchedCats.slice(0, 3) : cats.slice(0, 3)).map((c) => (
                <Link
                  key={`${c.slug}-${city}`}
                  href={`${localePrefix}/${c.slug}/${citySlug(city)}`}
                  className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {city} · {c.name}
                </Link>
              )),
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function SearchResults(props: {
  cats: CatItem[];
  cities: string[];
  localePrefix: string;
  labels: { categories: string; cities: string; empty: string; query: string };
}) {
  return (
    <Suspense fallback={<div className="text-gray-500">…</div>}>
      <Inner {...props} />
    </Suspense>
  );
}
