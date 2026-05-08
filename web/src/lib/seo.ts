// SEO helpers — JSON-LD schema builders for Schema.org

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const NAME = 'Yapgitsin';

export function siteUrl(path = ''): string {
  return `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    employmentType: 'CONTRACTOR',
    industry: job.category,
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'TR' },
    },
    hiringOrganization: { '@type': 'Organization', name: NAME, sameAs: SITE },
    ...(job.budgetMin && job.budgetMax
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'TRY',
            value: { '@type': 'QuantitativeValue', minValue: job.budgetMin, maxValue: job.budgetMax, unitText: 'JOB' },
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
