import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getWorkers,
  unwrap,
  slugify,
  TR_CITIES,
  type Worker,
} from '@/lib/api';
import { jsonLd, breadcrumbLD, clip } from '@/lib/seo';
import { WorkerCard } from '../../[kategori]/page';

type Params = { slug: string };
type SearchParams = { c?: string };

// Phase 155: Pre-render all cities for static export
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return TR_CITIES.map((city) => ({ slug: slugify(city) }));
}
export const dynamicParams = false;

async function findCity(slug: string) {
  return TR_CITIES.find((c) => slugify(c) === slug) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await findCity(slug);

  if (!city) return { title: 'Şehir bulunamadı' };

  const title = `${city} Hizmet Ustaları`;
  const desc = clip(`${city}'da tüm kategorilerde güvenilir, doğrulanmış ustalar.`, 158);
  return { title, description: desc, openGraph: { title, description: desc } };
}

export default async function CityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const city = await findCity(slug);

  if (!city) return notFound();

  const workersResp = await getWorkers({
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
            breadcrumbLD([
              { name: 'Anasayfa', url: '/' },
              { name: city, url: `/sehir/${slug}` },
            ]),
          ),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">
              Anasayfa
            </Link>{' '}
            / <span className="text-[var(--secondary)]">{city}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--secondary)] mb-2 leading-tight">
            {city} Hizmet Ustaları
          </h1>
          <p className="text-gray-600">
            {city} bölgesinde tüm hizmetleri veren {workers.length} usta listeleniyor.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        {workers.length === 0 ? (
          <p className="text-gray-500">
            {city} için henüz usta listelenmemiş.
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
