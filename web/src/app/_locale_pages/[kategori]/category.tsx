import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getCategories,
  getWorkers,
  unwrap,
  slugify,
  TR_CITIES,
  FALLBACK_CATEGORY_SLUGS,
  type Worker,
} from '@/lib/api';
import { jsonLd, serviceLD, breadcrumbLD, faqPageLD, clip } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import CategorySeoContent from '@/components/CategorySeoContent';
import WorkerListClient from '@/components/WorkerListClient';
import { getCategoryContent } from '@/lib/category-content';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';

export async function getCategoryStaticSlugs(): Promise<string[]> {
  const cats = await getCategories();
  return cats && cats.length > 0
    ? cats.map((c) => slugify(c.name))
    : FALLBACK_CATEGORY_SLUGS;
}

async function findCategory(slug: string) {
  const cats = (await getCategories()) || [];
  return cats.find((c) => slugify(c.name) === slug) || null;
}

export async function buildCategoryMetadata(L: Locale, kategori: string): Promise<Metadata> {
  const dict = getDict(L);
  const cat = await findCategory(kategori);
  if (!cat) return { title: dict.common.category_not_found };
  const title = `${cat.name} — ${dict.site.title}`;
  const desc = clip(`${cat.name}: ${cat.description || dict.site.tagline}`, 158);
  return { title, description: desc, openGraph: { title, description: desc, type: 'website' } };
}

export default async function renderCategory(L: Locale, kategori: string) {
  const dict = getDict(L);
  const cat = await findCategory(kategori);
  if (!cat) return notFound();

  const workersResp = await getWorkers({ category: cat.name, limit: '24' });
  const workers = unwrap(workersResp);
  const seoContent = getCategoryContent(cat.name);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(serviceLD(cat.name, cat.description)) }} />
      {seoContent?.faqs?.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLD(seoContent.faqs)) }} />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([
            { name: dict.breadcrumb.home, url: localePath(L, '/') },
            { name: cat.name, url: localePath(L, `/${kategori}`) },
          ])),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <Breadcrumbs
            items={[
              { label: dict.breadcrumb.home, href: localePath(L, '/') },
              { label: cat.name },
            ]}
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--secondary)] mb-3 leading-tight">
            {cat.icon} {cat.name}
          </h1>
          <p className="text-gray-600 max-w-3xl">
            {cat.description || `${cat.name} — ${dict.site.tagline}`}
          </p>
          {cat.subServices?.length ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {cat.subServices.map((s) => (
                <span key={s} className="bg-[var(--primary-light)] text-[var(--primary)] px-3 py-1 rounded-full text-xs">{s}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-5">{cat.name} {dict.common.providers_for}</h2>
        <WorkerListClient workers={workers as Worker[]} locale={L} />
      </section>

      <CategorySeoContent categoryName={cat.name} content={seoContent} />

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 border-t border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <LeadForm
            source="category"
            category={cat.name}
            title={`${cat.name} — ${dict.lead.category_lead_title}`}
            subtitle={dict.lead.category_lead_sub}
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-4">{cat.name} — {dict.common.city_label}</h2>
        <div className="flex flex-wrap gap-2">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={localePath(L, `/${kategori}/${slugify(city)}`)}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function WorkerCardI18n({ w, locale }: { w: Worker; locale: Locale }) {
  const dict = getDict(locale);
  return (
    <Link
      href={localePath(locale, `/usta/${slugify(w.fullName || 'usta')}-${w.id}`)}
      className="group block bg-white border border-[var(--border)] rounded-2xl p-5 hover:shadow-xl hover:shadow-blue-900/5 hover:border-[var(--primary)] hover:-translate-y-1 transition-all duration-200"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] ring-2 ring-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-lg flex-shrink-0">
          {w.fullName?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate text-[var(--secondary)] flex items-center gap-1.5">
            {w.fullName}
            {w.identityVerified && (
              <span title={dict.common.verified} className="text-[var(--primary)] text-sm flex-shrink-0">✓</span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">{w.city || dict.common.all_turkey}</div>
        </div>
      </div>
      {w.workerBio && <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed min-h-[32px]">{w.workerBio}</p>}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
        <span className="text-[var(--accent)] font-bold">
          ★ {(w.averageRating || 0).toFixed(1)} <span className="text-gray-400 font-normal">({w.totalReviews || 0})</span>
        </span>
        {w.hourlyRateMin ? (
          <span className="text-gray-500 font-medium">{w.hourlyRateMin}+ {dict.common.tl_per_hour}</span>
        ) : (
          <span className="font-semibold text-[var(--primary)] group-hover:text-[var(--primary-dark)]">
            {(dict.site as any).message_now || 'Mesajla'} →
          </span>
        )}
      </div>
    </Link>
  );
}
