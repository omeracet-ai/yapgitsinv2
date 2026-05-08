import type { Metadata } from 'next';
import { getCategories, slugify, TR_CITIES, FALLBACK_CATEGORY_SLUGS } from '@/lib/api';
import { getDict, localePath, type Locale, DEFAULT_LOCALE } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import SearchResults from '@/components/SearchResults';

export function buildSearchMetadata(L: Locale): Metadata {
  const dict = getDict(L);
  return { title: `${dict.common.search} — ${dict.site.title}`, description: dict.site.tagline, robots: { index: false } };
}

export default async function renderSearch(L: Locale) {
  const dict = getDict(L);
  const cats = (await getCategories()) || [];
  const catList = cats.length
    ? cats.map((c) => ({ name: c.name, slug: slugify(c.name), icon: c.icon }))
    : FALLBACK_CATEGORY_SLUGS.map((s) => ({ name: s, slug: s, icon: '' }));
  const localePrefix = L === DEFAULT_LOCALE ? '' : `/${L}`;

  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: dict.breadcrumb.home, href: localePath(L, '/') },
          { label: dict.common.search },
        ]}
      />
      <SearchResults
        cats={catList}
        cities={[...TR_CITIES]}
        localePrefix={localePrefix}
        labels={{
          categories: dict.common.main_categories,
          cities: dict.common.popular_cities,
          empty: dict.common.not_found,
          query: dict.common.search,
        }}
      />
    </section>
  );
}
