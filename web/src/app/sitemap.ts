import type { MetadataRoute } from 'next';
import {
  getCategories,
  getWorkers,
  getJobs,
  getBlogPosts,
  unwrap,
  slugify,
  TR_CITIES,
  TIER_1_CATEGORIES,
  TIER_2_CATEGORIES,
} from '@/lib/api';

// Required for `output: 'export'` — sitemap is generated once at build time.
export const dynamic = 'force-static';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yapgitsin.tr';

// Build hreflang alternates for a locale-agnostic path (e.g. '/temizlik').
// TR (default) lives at root; EN/AZ at /en, /az. Plus x-default = TR.
function altLanguages(path: string): Record<string, string> {
  const clean = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`);
  return {
    tr: `${SITE}${clean || '/'}`,
    en: `${SITE}/en${clean}`,
    az: `${SITE}/az${clean}`,
    'x-default': `${SITE}${clean || '/'}`,
  };
}

// Phase 97 — tier-aware priority/changefreq.
function tierOf(slug: string): 1 | 2 | 3 {
  if (TIER_1_CATEGORIES.includes(slug)) return 1;
  if (TIER_2_CATEGORIES.includes(slug)) return 2;
  return 3;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cats = (await getCategories()) || [];
  const workers = unwrap(await getWorkers({ limit: '100' })).slice(0, 100);
  const jobs = unwrap(await getJobs({ limit: '100' })).slice(0, 100);

  // Phase 91: hreflang alternates per entry.
  // Phase 97: priority + changeFrequency + dynamic lastModified per tier.
  const urls: MetadataRoute.Sitemap = [];

  urls.push({
    url: `${SITE}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
    alternates: { languages: altLanguages('/') },
  });

  for (const c of cats) {
    const slug = slugify(c.name);
    const tier = tierOf(slug);
    const catPriority = tier === 1 ? 0.9 : tier === 2 ? 0.8 : 0.8;
    const cityPriority = tier === 1 ? 0.7 : 0.6;

    urls.push({
      url: `${SITE}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: catPriority,
      alternates: { languages: altLanguages(`/${slug}`) },
    });
    for (const city of TR_CITIES) {
      const citySlug = slugify(city);
      urls.push({
        url: `${SITE}/${slug}/${citySlug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: cityPriority,
        alternates: { languages: altLanguages(`/${slug}/${citySlug}`) },
      });
    }
  }

  for (const w of workers) {
    const path = `/usta/${slugify(w.fullName || 'usta')}-${w.id}`;
    const wAny = w as unknown as { lastSeenAt?: string; updatedAt?: string };
    const lm = wAny.lastSeenAt || wAny.updatedAt;
    urls.push({
      url: `${SITE}${path}`,
      lastModified: lm ? new Date(lm) : now,
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: { languages: altLanguages(path) },
    });
  }

  // Phase 133 — customer profile pages (derived from jobs' customerId)
  const customerSeen = new Set<string>();
  for (const j of jobs) {
    const cid = (j as unknown as { customerId?: string; customer?: { fullName?: string } }).customerId;
    const cname = (j as unknown as { customer?: { fullName?: string } }).customer?.fullName || 'musteri';
    if (cid && !customerSeen.has(cid)) {
      customerSeen.add(cid);
      const path = `/musteri/${slugify(cname)}-${cid}`;
      urls.push({
        url: `${SITE}${path}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
        alternates: { languages: altLanguages(path) },
      });
    }
  }

  for (const j of jobs) {
    const path = `/ilan/${slugify(j.title || 'ilan')}-${j.id}`;
    const jAny = j as unknown as { updatedAt?: string; createdAt?: string };
    const lm = jAny.updatedAt || jAny.createdAt;
    urls.push({
      url: `${SITE}${path}`,
      lastModified: lm ? new Date(lm) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: { languages: altLanguages(path) },
    });
  }

  // Phase 158 — blog list + detail pages
  urls.push({
    url: `${SITE}/blog`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
    alternates: { languages: altLanguages('/blog') },
  });
  const blogResult = await getBlogPosts({ page: '1', limit: '100' });
  const blogPosts = blogResult?.data ?? [];
  for (const p of blogPosts) {
    const path = `/blog/${p.slug}`;
    const lm = p.updatedAt || p.publishedAt || p.createdAt;
    urls.push({
      url: `${SITE}${path}`,
      lastModified: lm ? new Date(lm) : now,
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: { languages: altLanguages(path) },
    });
  }

  return urls;
}
