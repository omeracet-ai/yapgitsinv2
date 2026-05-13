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
import { jsonLd, serviceLD, breadcrumbLD, faqPageLD, clip, siteUrl, alternateLinks, ogLocaleFor } from '@/lib/seo';
import CategorySeoContent from '@/components/CategorySeoContent';
import WorkerListClient from '@/components/WorkerListClient';
import { getCategoryContent } from '@/lib/category-content';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';

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
  // Root layout adds "| Yapgitsin" via title template — don't duplicate.
  const title =
    L === 'tr'
      ? `${city} ${cat.name} Hizmetleri`
      : L === 'az'
        ? `${city} ${cat.name}`
        : `${cat.name} in ${city}`;
  const desc = clip(
    L === 'tr'
      ? `${city}'da ${cat.name.toLowerCase()} için uzman ustalar. Yapgitsin ile hızlı teklif al, güvenle öde.`
      : L === 'az'
        ? `${city} şəhərində ${cat.name.toLowerCase()} üçün etibarlı ustalar. Yapgitsin ilə sürətli təklif al.`
        : `Trusted ${cat.name.toLowerCase()} pros in ${city}. Get fast quotes and pay safely with Yapgitsin.`,
    158,
  );
  const path = `/${kategori}/${sehir}`;
  const url = siteUrl(localePath(L, path));
  const ogLoc = ogLocaleFor(L);
  return {
    title,
    description: desc,
    alternates: alternateLinks(path),
    openGraph: {
      title,
      description: desc,
      type: 'website',
      url,
      siteName: 'Yapgitsin',
      locale: ogLoc.locale,
      alternateLocale: ogLoc.alternateLocale,
    },
    twitter: { card: 'summary_large_image', title, description: desc },
  };
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
          <Breadcrumbs
            items={[
              { label: dict.breadcrumb.home, href: localePath(L, '/') },
              { label: cat.name, href: localePath(L, `/${kategori}`) },
              { label: city },
            ]}
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--secondary)] mb-2 leading-tight">
            {city} {cat.name}
          </h1>
          <p className="text-gray-600">{city} — {cat.name} ({workers.length})</p>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <WorkerListClient workers={workers as Worker[]} locale={L} emptyText={`${city} ${dict.common.no_workers_in_city}`} />
      </section>

      <CategorySeoContent categoryName={cat.name} city={city} content={seoContent} />
    </>
  );
}
