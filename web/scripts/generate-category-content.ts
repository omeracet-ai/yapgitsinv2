/**
 * Build-time AI SEO content generator (Phase 142 hardened).
 *
 * For each (category × top-N city) combination, calls the backend
 * /ai/generate-category-description endpoint and writes results to
 * src/data/category-content.json.
 *
 *   npm run generate-content              # partial cache (skip existing)
 *   npm run generate-content -- --force   # regenerate all entries
 *
 * Env:
 *   NEXT_PUBLIC_API_URL       backend base (required; if missing → skip + warn)
 *   GEN_CONTENT_PARALLELISM   parallel pool size (default 10)
 *   GEN_CONTENT_MAX_RETRIES   per-entry retries (default 3)
 *
 * Resilience:
 *  - existing JSON entries skipped unless --force
 *  - exponential backoff on network errors (3 retries)
 *  - script never exits non-zero on per-entry failures (partial JSON written)
 *  - if NEXT_PUBLIC_API_URL unset → graceful skip, preserves existing JSON
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const API = process.env.NEXT_PUBLIC_API_URL;
const OUT = path.join(process.cwd(), 'src', 'data', 'category-content.json');
const MAX_PARALLEL = Number(process.env.GEN_CONTENT_PARALLELISM) || 10;
const MAX_RETRIES = Number(process.env.GEN_CONTENT_MAX_RETRIES) || 3;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateOne(
  category: string,
  city?: string,
): Promise<CategoryContent | null> {
  const label = `${category}${city ? `/${city}` : ''}`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API}/ai/generate-category-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, city, length: 'medium' }),
      });
      if (!res.ok) {
        // 4xx is permanent — do not retry
        if (res.status >= 400 && res.status < 500) {
          console.error(`  x ${label} -> HTTP ${res.status} (no retry)`);
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as CategoryContent;
    } catch (e) {
      const msg = (e as Error).message;
      if (attempt === MAX_RETRIES) {
        console.error(`  x ${label} -> ${msg} (gave up after ${MAX_RETRIES})`);
        return null;
      }
      const backoff = 500 * Math.pow(2, attempt - 1);
      console.warn(`  ~ ${label} -> ${msg} (retry ${attempt}/${MAX_RETRIES} in ${backoff}ms)`);
      await sleep(backoff);
    }
  }
  return null;
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
  if (!API) {
    console.warn('[generate-content] NEXT_PUBLIC_API_URL unset — skipping generation, preserving existing JSON');
    return;
  }
  console.log(`[generate-content] backend: ${API}  parallel=${MAX_PARALLEL}  retries=${MAX_RETRIES}  force=${FORCE}`);
  const existing = await loadExisting();
  const cats = await fetchCategories();

  type Job = { key: string; category: string; city?: string };
  const allJobs: Job[] = [];
  for (const c of cats) {
    allJobs.push({ key: c.slug, category: c.name });
    for (const city of TOP_CITIES) {
      allJobs.push({ key: `${c.slug}/${slugify(city)}`, category: c.name, city });
    }
  }

  const jobs = FORCE ? allJobs : allJobs.filter((j) => !existing[j.key]);
  const skipped = allJobs.length - jobs.length;
  console.log(`[generate-content] ${allJobs.length} total, ${jobs.length} to generate, ${skipped} cached`);

  const out: ContentMap = { ...existing };
  let done = 0;
  let ok = 0;
  let failed = 0;

  await runPool(
    jobs,
    async (job) => {
      const result = await generateOne(job.category, job.city);
      done++;
      if (result) {
        out[job.key] = result;
        ok++;
      } else {
        failed++;
      }
      if (done % 10 === 0 || done === jobs.length) {
        console.log(`  ${done}/${jobs.length} (ok=${ok} fail=${failed})`);
      }
      // persist progressively every 25 entries — partial cache survives crashes
      if (done % 25 === 0) {
        try {
          await fs.mkdir(path.dirname(OUT), { recursive: true });
          await fs.writeFile(OUT, JSON.stringify(out, null, 2), 'utf8');
        } catch {
          /* best-effort */
        }
      }
    },
    MAX_PARALLEL,
  );

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(
    `[generate-content] wrote ${OUT} — Generated ${ok} new, skipped ${skipped} cached, failed ${failed} (total entries: ${Object.keys(out).length})`,
  );
}

main().catch((e) => {
  // Never fail the script — partial JSON should already be on disk.
  console.error('[generate-content] fatal:', e);
  process.exit(0);
});
