import Link from 'next/link';
import { getCategories, getWorkers, slugify, unwrap, TR_CITIES } from '@/lib/api';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import SearchBar from '@/components/SearchBar';
import StatsBadge from '@/components/home/StatsBadge';
import { getDict, localePath, type Locale, DEFAULT_LOCALE } from '@/i18n';

const SEARCH_PLACEHOLDER: Record<string, string> = {
  tr: 'Hizmet veya şehir ara...',
  en: 'Search service or city...',
  az: 'Xidmət və ya şəhər axtar...',
};

export default async function renderHome(L: Locale) {
  const dict = getDict(L);
  const localePrefix = L === DEFAULT_LOCALE ? '' : `/${L}`;

  const [cats, workersResp] = await Promise.all([
    getCategories(),
    getWorkers({ limit: '8' }),
  ]);
  const categories = (cats || []).slice(0, 8);
  const workers = unwrap(workersResp).slice(0, 8);
  const searchCats = (cats || []).map((c) => ({ name: c.name, slug: slugify(c.name), icon: c.icon }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([{ name: dict.breadcrumb.home, url: localePath(L, '/') }])),
        }}
      />

      {/* HERO — Airtasker-style: bold headline, search prominent, dual CTA, trust strip */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px, 60px 60px',
          }}
        />
        <div className="relative container mx-auto px-4 md:px-6 lg:px-8 pt-14 md:pt-24 pb-16 md:pb-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 leading-[1.1] tracking-tight max-w-4xl mx-auto">
            {dict.site.hero_title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            {dict.site.hero_subtitle}
          </p>

          {/* Prominent search */}
          <div className="max-w-2xl mx-auto mb-6 bg-white rounded-2xl p-2 shadow-2xl ring-1 ring-black/5">
            <SearchBar
              cats={searchCats}
              cities={[...TR_CITIES]}
              localePrefix={localePrefix}
              placeholder={(dict as any).site?.hero_subtitle ? SEARCH_PLACEHOLDER[L] || SEARCH_PLACEHOLDER.tr : SEARCH_PLACEHOLDER.tr}
            />
          </div>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row sm:justify-center gap-3 mb-10">
            <Link
              href={localePath(L, '/temizlik')}
              className="bg-[var(--accent)] hover:brightness-110 text-white px-7 py-3.5 rounded-xl font-semibold text-base min-h-[52px] inline-flex items-center justify-center shadow-lg shadow-orange-900/20 transition"
            >
              {(dict.site as any).cta_post_job || dict.nav.find_service}
            </Link>
            <Link
              href={localePath(L, '/elektrikci')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold text-base min-h-[52px] inline-flex items-center justify-center transition"
            >
              {(dict.site as any).cta_become_worker || dict.nav.browse_categories}
            </Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm md:text-base text-white/85 font-medium">
            <span className="inline-flex items-center gap-2"><span className="text-[var(--accent)]">✓</span>{(dict.site as any).trust_workers || '10.000+ Usta'}</span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/40" />
            <span className="inline-flex items-center gap-2"><span className="text-[var(--accent)]">✓</span>{(dict.site as any).trust_jobs || '5.000+ İş'}</span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/40" />
            <span className="inline-flex items-center gap-2"><span className="text-[var(--accent)]">★</span>{(dict.site as any).trust_satisfaction || '%97 Memnuniyet'}</span>
          </div>
        </div>
      </section>

      {/* STATS BADGE — Phase 176 — graceful (null if API offline) */}
      <StatsBadge />

      {/* CATEGORIES — Airtasker tile grid: large icon, bold name, hover lift */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-2">{dict.common.main_categories}</h2>
          <p className="text-gray-500 text-sm md:text-base">{dict.site.tagline}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={localePath(L, `/${slugify(c.name)}`)}
              className="group bg-white border border-[var(--border)] rounded-2xl p-5 md:p-6 hover:shadow-xl hover:shadow-blue-900/5 hover:border-[var(--primary)] hover:-translate-y-1 transition-all duration-200 text-center min-h-[140px] flex flex-col items-center justify-center"
            >
              <div className="text-4xl md:text-5xl mb-3 group-hover:scale-110 transition-transform">{c.icon}</div>
              <div className="font-bold text-sm md:text-base text-[var(--secondary)] group-hover:text-[var(--primary)] transition-colors">{c.name}</div>
              {c.description ? (
                <div className="text-xs text-gray-500 mt-1.5 line-clamp-2 hidden md:block">{c.description}</div>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {/* WORKERS — Airtasker pro cards with prominent CTA */}
      {workers.length > 0 && (
        <section className="bg-[var(--muted)] py-14 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-2">{dict.common.featured_workers}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="bg-white border border-[var(--border)] rounded-2xl p-5 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  <Link
                    href={localePath(L, `/usta/${slugify(w.fullName)}-${w.id}`)}
                    className="flex items-center gap-3 mb-3"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-light)] ring-2 ring-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-lg flex-shrink-0">
                      {w.fullName?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-[var(--secondary)] flex items-center gap-1">
                        {w.fullName}
                        {w.identityVerified && (
                          <span title={dict.common.verified} className="text-[var(--primary)] text-sm flex-shrink-0">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{w.city || dict.common.all_turkey}</div>
                    </div>
                  </Link>
                  <div className="text-xs text-gray-600 line-clamp-2 mb-3 min-h-[32px]">
                    {(w.workerCategories || []).join(' · ')}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
                    {w.averageRating ? (
                      <span className="text-xs text-[var(--accent)] font-bold">
                        ★ {w.averageRating.toFixed(1)} <span className="text-gray-400 font-normal">({w.totalReviews || 0})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    <Link
                      href={localePath(L, `/usta/${slugify(w.fullName)}-${w.id}`)}
                      className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
                    >
                      {(dict.site as any).message_now || 'Mesajla'} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LEAD FORM */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="max-w-2xl mx-auto">
          <LeadForm
            source="landing"
            title={dict.lead.quick_contact}
            subtitle={dict.lead.quick_contact_sub}
          />
        </div>
      </section>

      {/* CITIES */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 pb-16 md:pb-20">
        <h2 className="text-xl md:text-2xl font-bold mb-5 md:mb-6 text-[var(--secondary)] text-center">{dict.common.popular_cities}</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={localePath(L, `/temizlik/${slugify(city)}`)}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm text-[var(--secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-sm min-h-[40px] inline-flex items-center transition-all"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
