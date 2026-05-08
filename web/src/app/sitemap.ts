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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cats = (await getCategories()) || [];
  const workers = unwrap(await getWorkers({ limit: '100' })).slice(0, 100);
  const jobs = unwrap(await getJobs({ limit: '100' })).slice(0, 100);

  const urls: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1 },
  ];

  for (const c of cats) {
    const slug = slugify(c.name);
    urls.push({
      url: `${SITE}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    for (const city of TR_CITIES) {
      urls.push({
        url: `${SITE}/${slug}/${slugify(city)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  for (const w of workers) {
    urls.push({
      url: `${SITE}/usta/${slugify(w.fullName || 'usta')}-${w.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  for (const j of jobs) {
    urls.push({
      url: `${SITE}/ilan/${slugify(j.title || 'ilan')}-${j.id}`,
      lastModified: j.createdAt ? new Date(j.createdAt) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return urls;
}
