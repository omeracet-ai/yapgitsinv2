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
import { WorkerCardI18n } from '../category';
import CategorySeoContent from '@/components/CategorySeoContent';
import { getCategoryContent } from '@/lib/category-content';
import { getDict, localePath, type Locale } from '@/i18n';

export async function getCategoryCityStaticParams(): Promise<{ kategori: string; sehir: string }[]> {
  const cats = await getCategories();
  const slugs = cats && cats.length > 0
    ? cats.map((c) => slugify(c.name))
    : FALLBACK_CATEGORY_SLUGS;
  const out: { kategori: string; sehir: string }[] = [];
  for (const k of slugs) {
    for (const city of TR_CITIES) out.push({ kategori: k, sehir: slugify(city) });
  }
  return out;
}

async function resolve(slug: string, citySlug: string) {
  const cats = (await getCategories()) || [];
  const cat = cats.find((c) => slugify(c.name) === slug);
  const city = TR_CITIES.find((c) => slugify(c) === citySlug);
  return { cat, city };
}

export async function buildCategoryCityMetadata(L: Locale, kategori: string, sehir: string): Promise<Metadata> {
  const dict = getDict(L);
  const { cat, city } = await resolve(kategori, sehir);
  if (!cat || !city) return { title: dict.common.not_found };
  const title = `${city} ${cat.name} — ${dict.site.title}`;
  const desc = clip(`${city} — ${cat.name}. ${dict.site.tagline}`, 158);
  return { title, description: desc, openGraph: { title, description: desc } };
}

export default async function renderCategoryCity(L: Locale, kategori: string, sehir: string) {
  const dict = getDict(L);
  const { cat, city } = await resolve(kategori, sehir);
  if (!cat || !city) return notFound();

  const workersResp = await getWorkers({ category: cat.name, city, limit: '24' });
  const workers = unwrap(workersResp);
  const seoContent = getCategoryContent(cat.name, city);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(serviceLD(`${city} ${cat.name}`, `${city} — ${cat.name}.`)) }} />
      {seoContent?.faqs?.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLD(seoContent.faqs)) }} />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([
            { name: dict.breadcrumb.home, url: localePath(L, '/') },
            { name: cat.name, url: localePath(L, `/${kategori}`) },
            { name: city, url: localePath(L, `/${kategori}/${sehir}`) },
          ])),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href={localePath(L, '/')} className="hover:underline">{dict.breadcrumb.home}</Link>{' / '}
            <Link href={localePath(L, `/${kategori}`)} className="hover:underline">{cat.name}</Link>{' / '}
            <span className="text-[var(--secondary)]">{city}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--secondary)] mb-2 leading-tight">
            {city} {cat.name}
          </h1>
          <p className="text-gray-600">{city} — {cat.name} ({workers.length})</p>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {workers.length === 0 ? (
          <p className="text-gray-500">{city} {dict.common.no_workers_in_city}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {workers.map((w: Worker) => (<WorkerCardI18n key={w.id} w={w} locale={L} />))}
          </div>
        )}
      </section>

      <CategorySeoContent categoryName={cat.name} city={city} content={seoContent} />
    </>
  );
}
