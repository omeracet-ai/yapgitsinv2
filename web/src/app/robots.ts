import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yapgitsin.tr';

// Phase 97 — robots.txt enrichment: explicit disallows for API/admin/internal,
// crawl-delay for politeness, sitemap pointer.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/api/', '/admin/', '/_next/', '/private/'],
        crawlDelay: 1,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
