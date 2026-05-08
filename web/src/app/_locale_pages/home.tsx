import Link from 'next/link';
import { getCategories, getWorkers, slugify, unwrap, TR_CITIES } from '@/lib/api';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import { getDict, localePath, type Locale } from '@/i18n';

export default async function renderHome(L: Locale) {
  const dict = getDict(L);

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
          __html: jsonLd(breadcrumbLD([{ name: dict.breadcrumb.home, url: localePath(L, '/') }])),
        }}
      />
      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {dict.site.hero_title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-6 md:mb-8">
            {dict.site.hero_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3">
            <Link
              href={localePath(L, '/temizlik')}
              className="bg-[var(--accent)] hover:opacity-90 text-white px-6 py-3 rounded-lg font-semibold min-h-[48px] inline-flex items-center justify-center"
            >
              {dict.nav.find_service}
            </Link>
            <Link
              href={localePath(L, '/elektrikci')}
              className="bg-white/10 backdrop-blur hover:bg-white/20 px-6 py-3 rounded-lg font-semibold min-h-[48px] inline-flex items-center justify-center"
            >
              {dict.nav.browse_categories}
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5 md:mb-6 text-[var(--secondary)]">{dict.common.main_categories}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={localePath(L, `/${slugify(c.name)}`)}
              className="bg-white border border-[var(--border)] rounded-xl p-4 md:p-5 hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5 transition-all min-h-[112px]"
            >
              <div className="text-2xl md:text-3xl mb-2">{c.icon}</div>
              <div className="font-semibold text-sm md:text-base text-[var(--secondary)]">{c.name}</div>
              {c.description ? (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2 hidden sm:block">{c.description}</div>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {workers.length > 0 && (
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5 md:mb-6 text-[var(--secondary)]">{dict.common.featured_workers}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {workers.map((w) => (
              <Link
                key={w.id}
                href={localePath(L, `/usta/${slugify(w.fullName)}-${w.id}`)}
                className="bg-white border border-[var(--border)] rounded-xl p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold">
                    {w.fullName?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-[var(--secondary)]">{w.fullName}</div>
                    <div className="text-xs text-gray-500 truncate">{w.city || dict.common.all_turkey}</div>
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

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12">
        <div className="max-w-2xl mx-auto">
          <LeadForm
            source="landing"
            title={dict.lead.quick_contact}
            subtitle={dict.lead.quick_contact_sub}
          />
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5 md:mb-6 text-[var(--secondary)]">{dict.common.popular_cities}</h2>
        <div className="flex flex-wrap gap-2">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={localePath(L, `/temizlik/${slugify(city)}`)}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm text-[var(--secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] min-h-[40px] inline-flex items-center"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
