/**
 * Build-time AI SEO content generator.
 *
 * For each (category × top-N city) combination, calls the backend
 * /ai/generate-category-description endpoint and writes results to
 * src/data/category-content.json. Run manually with:
 *
 *   npm run generate-content
 *
 * Backend must be reachable at NEXT_PUBLIC_API_URL (default http://localhost:3001)
 * and must have ANTHROPIC_API_KEY set. If backend is unreachable, the script
 * preserves any existing JSON (or writes an empty object) so build still works.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const OUT = path.join(process.cwd(), 'src', 'data', 'category-content.json');
const MAX_PARALLEL = 5;

const FALLBACK_CATEGORY_SLUGS = [
  'temizlik', 'boya-badana', 'bahce-peyzaj', 'nakliyat', 'mobilya-montaj',
  'hasere-kontrolu', 'havuz-spa', 'cilingir-kilit', 'elektrikci', 'tesisat',
  'klima-isitma', 'zemin-parke', 'cati-yalitim', 'marangoz-ahsap',
  'cam-dograma', 'alcipan-asma-tavan', 'guvenlik-sistemleri',
  'bilgisayar-it', 'grafik-tasarim', 'web-yazilim', 'fotograf-video',
  'dugun-organizasyon', 'ozel-ders-egitim', 'saglik-guzellik', 'evcil-hayvan',
  'arac-oto-bakim',
];

const TOP_CITIES = [
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya',
  'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin',
];

const SLUG_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u',
};
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[çğıİöşü]/g, (c) => SLUG_MAP[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type CategoryContent = {
  description: string;
  headings: string[];
  faqs: { q: string; a: string }[];
};

type ContentMap = Record<string, CategoryContent>;

async function loadExisting(): Promise<ContentMap> {
  try {
    const raw = await fs.readFile(OUT, 'utf8');
    return JSON.parse(raw) as ContentMap;
  } catch {
    return {};
  }
}

async function fetchCategories(): Promise<{ name: string; slug: string }[]> {
  try {
    const res = await fetch(`${API}/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cats = (await res.json()) as { name: string }[];
    return cats.map((c) => ({ name: c.name, slug: slugify(c.name) }));
  } catch (e) {
    console.warn('[generate-content] /categories unreachable, using fallback slugs:', (e as Error).message);
    return FALLBACK_CATEGORY_SLUGS.map((slug) => ({ name: slug, slug }));
  }
}

async function generateOne(
  category: string,
  city?: string,
): Promise<CategoryContent | null> {
  try {
    const res = await fetch(`${API}/ai/generate-category-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, length: 'medium' }),
    });
    if (!res.ok) {
      console.warn(`  ✗ ${category}${city ? `/${city}` : ''} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as CategoryContent;
  } catch (e) {
    console.warn(`  ✗ ${category}${city ? `/${city}` : ''} → ${(e as Error).message}`);
    return null;
  }
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const queue = [...items];
  const runners: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    runners.push(
      (async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          await worker(next);
        }
      })(),
    );
  }
  await Promise.all(runners);
}

async function main() {
  console.log(`[generate-content] backend: ${API}`);
  const existing = await loadExisting();
  const cats = await fetchCategories();

  type Job = { key: string; category: string; city?: string };
  const jobs: Job[] = [];
  for (const c of cats) {
    jobs.push({ key: c.slug, category: c.name });
    for (const city of TOP_CITIES) {
      jobs.push({ key: `${c.slug}/${slugify(city)}`, category: c.name, city });
    }
  }

  console.log(`[generate-content] ${jobs.length} kombinasyon — concurrency ${MAX_PARALLEL}`);
  const out: ContentMap = { ...existing };
  let done = 0;
  let ok = 0;

  await runPool(
    jobs,
    async (job) => {
      const result = await generateOne(job.category, job.city);
      done++;
      if (result) {
        out[job.key] = result;
        ok++;
      }
      if (done % 10 === 0 || done === jobs.length) {
        console.log(`  ${done}/${jobs.length} (${ok} ok)`);
      }
    },
    MAX_PARALLEL,
  );

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`[generate-content] wrote ${OUT} (${Object.keys(out).length} entries)`);
}

main().catch((e) => {
  console.error('[generate-content] fatal:', e);
  process.exit(1);
});
