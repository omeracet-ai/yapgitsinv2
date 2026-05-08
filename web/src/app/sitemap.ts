import type { MetadataRoute } from 'next';
import {
  getCategories,
  getWorkers,
  getJobs,
  unwrap,
  slugify,
  TR_CITIES,
} from '@/lib/api';

// Required for `output: 'export'` — sitemap is generated once at build time.
export const dynamic = 'force-static';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cats = (await getCategories()) || [];
  const workers = unwrap(await getWorkers({ limit: '100' })).slice(0, 100);
  const jobs = unwrap(await getJobs({ limit: '100' })).slice(0, 100);

  // Phase 91: emit one entry per canonical TR URL with `alternates.languages`
  // map pointing to EN/AZ/x-default. Search engines now resolve all locale
  // variants from a single sitemap entry (xhtml:link rel="alternate" hreflang).
  const urls: MetadataRoute.Sitemap = [];

  urls.push({
    url: `${SITE}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1,
    alternates: { languages: altLanguages('/') },
  });

  for (const c of cats) {
    const slug = slugify(c.name);
    urls.push({
      url: `${SITE}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: { languages: altLanguages(`/${slug}`) },
    });
    for (const city of TR_CITIES) {
      const citySlug = slugify(city);
      urls.push({
        url: `${SITE}/${slug}/${citySlug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: altLanguages(`/${slug}/${citySlug}`) },
      });
    }
  }

  for (const w of workers) {
    const path = `/usta/${slugify(w.fullName || 'usta')}-${w.id}`;
    urls.push({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: { languages: altLanguages(path) },
    });
  }

  for (const j of jobs) {
    const path = `/ilan/${slugify(j.title || 'ilan')}-${j.id}`;
    urls.push({
      url: `${SITE}${path}`,
      lastModified: j.createdAt ? new Date(j.createdAt) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: { languages: altLanguages(path) },
    });
  }

  return urls;
}
