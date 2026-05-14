// SEO helpers — JSON-LD schema builders for Schema.org

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yapgitsin.tr';
const NAME = 'Yapgitsin';

export function siteUrl(path = ''): string {
  return `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

// Phase 91 — hreflang alternate links
// path: locale-agnostic path (no /en or /az prefix), e.g. '/temizlik/istanbul'
// Returns Next.js metadata `alternates` object: canonical + languages map.
// TR is the default locale (root, no prefix) and serves as x-default.
export function alternateLinks(path: string = '/'): {
  canonical: string;
  languages: Record<string, string>;
} {
  const clean = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`);
  return {
    canonical: `${SITE}${clean || '/'}`,
    languages: {
      tr: `${SITE}${clean || '/'}`,
      en: `${SITE}/en${clean}`,
      az: `${SITE}/az${clean}`,
      'x-default': `${SITE}${clean || '/'}`,
    },
  };
}

export const OG_LOCALE: Record<string, string> = {
  tr: 'tr_TR',
  en: 'en_US',
  az: 'az_AZ',
};

export function ogLocaleFor(locale: string): { locale: string; alternateLocale: string[] } {
  const main = OG_LOCALE[locale] || OG_LOCALE.tr;
  const alts = Object.entries(OG_LOCALE)
    .filter(([k]) => k !== locale)
    .map(([, v]) => v);
  return { locale: main, alternateLocale: alts };
}

export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function websiteLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: NAME,
    url: SITE,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE}/ara?q={query}`,
      'query-input': 'required name=query',
    },
  };
}

export function localBusinessLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: NAME,
    description: 'Türkiye\'nin hizmet marketplace platformu — temizlik, tadilat, elektrik, tesisat ve daha fazlası için güvenilir ustalar.',
    url: SITE,
    image: siteUrl('/og-default.png'),
    address: { '@type': 'PostalAddress', addressCountry: 'TR' },
    areaServed: { '@type': 'Country', name: 'Türkiye' },
  };
}

export function serviceLD(category: string, description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: category,
    description: description || `${category} hizmeti — Türkiye genelinde güvenilir ustalar.`,
    provider: { '@type': 'Organization', name: NAME, url: SITE },
    areaServed: { '@type': 'Country', name: 'Türkiye' },
    serviceType: category,
  };
}

export function personLD(worker: any) {
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: worker.fullName,
    jobTitle: (worker.workerCategories || []).join(', ') || 'Hizmet Sağlayıcı',
  };
  if (worker.profileImageUrl) ld.image = worker.profileImageUrl;
  if (worker.city) ld.address = { '@type': 'PostalAddress', addressLocality: worker.city, addressCountry: 'TR' };
  if (worker.averageRating && worker.totalReviews) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: worker.averageRating,
      reviewCount: worker.totalReviews,
    };
  }
  return ld;
}

export function jobPostingLD(job: any) {
  // Phase 122 — Google Jobs rich result enrichment.
  const validThrough = job.dueDate
    ? new Date(job.dueDate)
    : new Date(Date.parse(job.createdAt) + 30 * 86400000);
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    validThrough: validThrough.toISOString(),
    employmentType: 'CONTRACTOR',
    industry: job.category,
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'TR' },
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'Türkiye' },
    directApply: false,
    identifier: { '@type': 'PropertyValue', name: NAME, value: job.id },
    hiringOrganization: { '@type': 'Organization', name: NAME, sameAs: SITE },
    ...(job.budgetMin || job.budgetMax
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'TRY',
            value: {
              '@type': 'QuantitativeValue',
              ...(job.budgetMin ? { minValue: job.budgetMin } : {}),
              ...(job.budgetMax ? { maxValue: job.budgetMax } : {}),
              unitText: 'PROJECT',
            },
          },
        }
      : {}),
  };
}

export function breadcrumbLD(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: siteUrl(it.url),
    })),
  };
}

export function faqPageLD(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function clip(text: string, max: number): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
