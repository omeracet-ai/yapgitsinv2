import Link from 'next/link';
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
import { jsonLd, serviceLD, breadcrumbLD, clip } from '@/lib/seo';
import { WorkerCard } from '../page';

// Static export: pre-render every category × city combination at build time.
export const dynamicParams = false;

export async function generateStaticParams(): Promise<
  { kategori: string; sehir: string }[]
> {
  const cats = await getCategories();
  const slugs =
    cats && cats.length > 0
      ? cats.map((c) => slugify(c.name))
      : FALLBACK_CATEGORY_SLUGS;
  const out: { kategori: string; sehir: string }[] = [];
  for (const k of slugs) {
    for (const city of TR_CITIES) {
      out.push({ kategori: k, sehir: slugify(city) });
    }
  }
  return out;
}

type Params = { kategori: string; sehir: string };

async function resolve(slug: string, citySlug: string) {
  const cats = (await getCategories()) || [];
  const cat = cats.find((c) => slugify(c.name) === slug);
  const city = TR_CITIES.find((c) => slugify(c) === citySlug);
  return { cat, city };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { kategori, sehir } = await params;
  const { cat, city } = await resolve(kategori, sehir);
  if (!cat || !city) return { title: 'Bulunamadı' };
  const title = `${city} ${cat.name} Ustaları — Yerel Hizmet`;
  const desc = clip(
    `${city} bölgesinde ${cat.name.toLowerCase()} hizmeti veren güvenilir, doğrulanmış ustalar. Hızlı teklif alın, yerli platformda güvenle çalışın.`,
    158,
  );
  return { title, description: desc, openGraph: { title, description: desc } };
}

export default async function CategoryCityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { kategori, sehir } = await params;
  const { cat, city } = await resolve(kategori, sehir);
  if (!cat || !city) return notFound();

  const workersResp = await getWorkers({
    category: cat.name,
    city,
    limit: '24',
  });
  const workers = unwrap(workersResp);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            serviceLD(`${city} ${cat.name}`, `${city} bölgesinde ${cat.name} hizmeti.`),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: 'Anasayfa', url: '/' },
              { name: cat.name, url: `/${kategori}` },
              { name: city, url: `/${kategori}/${sehir}` },
            ]),
          ),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">Anasayfa</Link> /{' '}
            <Link href={`/${kategori}`} className="hover:underline">{cat.name}</Link> /{' '}
            <span className="text-[var(--secondary)]">{city}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--secondary)] mb-2 leading-tight">
            {city} {cat.name} Ustaları
          </h1>
          <p className="text-gray-600">
            {city} bölgesinde {cat.name.toLowerCase()} hizmeti veren {workers.length} usta listeleniyor.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {workers.length === 0 ? (
          <p className="text-gray-500">
            {city} için henüz {cat.name.toLowerCase()} ustası listelenmemiş.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {workers.map((w: Worker) => (
              <WorkerCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
