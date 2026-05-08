import Link from 'next/link';
import { getCategories, getWorkers, slugify, unwrap, TR_CITIES } from '@/lib/api';
import { jsonLd, breadcrumbLD } from '@/lib/seo';

export const revalidate = 3600;

export default async function HomePage() {
  const [cats, workersResp] = await Promise.all([
    getCategories(),
    getWorkers({ limit: '8' }),
  ]);
  const categories = (cats || []).slice(0, 8);
  const workers = unwrap(workersResp).slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([{ name: 'Anasayfa', url: '/' }])),
        }}
      />
      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Türkiye&apos;nin Güvenilir Hizmet Platformu
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Temizlik, tadilat, elektrik, tesisat ve daha fazlası için binlerce doğrulanmış ustaya ulaşın.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/temizlik"
              className="bg-[var(--accent)] hover:opacity-90 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Hizmet Bul
            </Link>
            <Link
              href="/elektrikci"
              className="bg-white/10 backdrop-blur hover:bg-white/20 px-6 py-3 rounded-lg font-semibold"
            >
              Kategorilere Göz At
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6 text-[var(--secondary)]">Ana Kategoriler</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/${slugify(c.name)}`}
              className="bg-white border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--primary)] transition-all"
            >
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="font-semibold text-[var(--secondary)]">{c.name}</div>
              {c.description ? (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</div>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {workers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6 text-[var(--secondary)]">Öne Çıkan Ustalar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workers.map((w) => (
              <Link
                key={w.id}
                href={`/usta/${slugify(w.fullName)}-${w.id}`}
                className="bg-white border border-[var(--border)] rounded-xl p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold">
                    {w.fullName?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-[var(--secondary)]">{w.fullName}</div>
                    <div className="text-xs text-gray-500 truncate">{w.city || 'Türkiye'}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 line-clamp-2">
                  {(w.workerCategories || []).join(', ')}
                </div>
                {w.averageRating ? (
                  <div className="text-xs mt-2 text-[var(--accent)] font-medium">
                    ★ {w.averageRating.toFixed(1)} ({w.totalReviews || 0})
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6 text-[var(--secondary)]">Popüler Şehirler</h2>
        <div className="flex flex-wrap gap-2">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/temizlik/${slugify(city)}`}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm text-[var(--secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
