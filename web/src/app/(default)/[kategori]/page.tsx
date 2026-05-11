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
import { jsonLd, serviceLD, breadcrumbLD, faqPageLD, clip } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import CategorySeoContent from '@/components/CategorySeoContent';
import { getCategoryContent } from '@/lib/category-content';

// Static export: pre-render all category slugs at build time.
// If backend is unreachable, fall back to the known seed slug list so the build
// still succeeds (sitemap will also use the fallback).
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ kategori: string }[]> {
  const cats = await getCategories();
  if (cats && cats.length > 0) {
    return cats.map((c) => ({ kategori: slugify(c.name) }));
  }
  return FALLBACK_CATEGORY_SLUGS.map((kategori) => ({ kategori }));
}

type Params = { kategori: string };

async function findCategory(slug: string) {
  const cats = (await getCategories()) || [];
  return cats.find((c) => slugify(c.name) === slug) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { kategori } = await params;
  const cat = await findCategory(kategori);
  if (!cat) return { title: 'Kategori bulunamadı' };
  const title = `${cat.name} Ustaları — Türkiye Geneli Hizmet`;
  const desc = clip(
    `${cat.name} hizmeti için doğrulanmış, deneyimli ustaları Yapgitsin'de bulun. ${
      cat.description || 'Hızlı teklif al, güvenle hizmet al.'
    }`,
    158,
  );
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: 'website' },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { kategori } = await params;
  const cat = await findCategory(kategori);
  if (!cat) return notFound();

  const workersResp = await getWorkers({ category: cat.name, limit: '24' });
  const workers = unwrap(workersResp);
  const seoContent = getCategoryContent(cat.name);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(serviceLD(cat.name, cat.description)),
        }}
      />
      {seoContent?.faqs?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqPageLD(seoContent.faqs)) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: 'Anasayfa', url: '/' },
              { name: cat.name, url: `/${kategori}` },
            ]),
          ),
        }}
      />

      <section className="bg-gradient-to-br from-[var(--primary)] via-orange-400 to-yellow-300 text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
          <nav className="text-xs text-white/80 mb-4">
            <Link href="/" className="hover:text-white hover:underline">
              Anasayfa
            </Link>{' '}
            / <span className="text-white/95">{cat.name}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight drop-shadow-sm">
            {cat.icon} {cat.name}
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-3xl leading-relaxed drop-shadow-sm">
            {cat.description ||
              `Türkiye genelinde ${cat.name.toLowerCase()} hizmeti veren güvenilir, doğrulanmış ustalarla işin bittiğine emin olun.`}
          </p>
          {cat.subServices?.length ? (
            <div className="flex flex-wrap gap-2 mt-6">
              {cat.subServices.map((s) => (
                <span
                  key={s}
                  className="bg-white/25 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm border border-white/30"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-5">
          {cat.name} Sağlayıcıları
        </h2>
        {workers.length === 0 ? (
          <p className="text-gray-500">Henüz bu kategoride listelenmiş usta yok.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {workers.map((w: Worker) => (
              <WorkerCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>

      <CategorySeoContent categoryName={cat.name} content={seoContent} />

      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 border-t border-[var(--border)]">
        <div className="max-w-2xl mx-auto">
          <LeadForm
            source="category"
            category={cat.name}
            title={`${cat.name} için teklif al`}
            subtitle={`İhtiyacınızı yazın, ${cat.name.toLowerCase()} ustalarından dönüş alalım.`}
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-4">
          {cat.name} — Şehirler
        </h2>
        <div className="flex flex-wrap gap-2">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/sehir/${slugify(city)}?c=${kategori}`}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function WorkerCard({ w }: { w: Worker }) {
  return (
    <Link
      href={`/usta/${slugify(w.fullName || 'usta')}-${w.id}`}
      className="block bg-white border border-[var(--border)] rounded-[20px] p-4 md:p-5 shadow-[0_6px_18px_rgba(17,24,39,0.06),0_2px_4px_rgba(17,24,39,0.04)] hover:shadow-[0_14px_30px_rgba(255,90,31,0.12),0_4px_10px_rgba(17,24,39,0.06)] hover:border-[var(--primary)] hover:-translate-y-1 transition-all duration-200"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold text-base md:text-lg flex-shrink-0">
          {w.fullName?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-[var(--secondary)] flex items-center gap-1.5">
            {w.fullName}
            {w.identityVerified && (
              <span className="text-[var(--primary)] text-sm flex-shrink-0" title="Kimlik doğrulanmış">
                ✓
              </span>
            )}
          </div>
          <div className="text-xs text-[#9CA3AF] truncate">{w.city || 'Türkiye'}</div>
        </div>
      </div>
      {w.workerBio && (
        <p className="text-xs text-[#374151] line-clamp-2 mb-3 leading-relaxed">
          {w.workerBio}
        </p>
      )}
      <div className="flex items-center justify-between text-xs border-t border-[#F3F3F5] pt-3">
        <span className="text-[var(--accent)] font-semibold flex items-center gap-0.5">
          ★ {(w.averageRating || 0).toFixed(1)} {w.totalReviews ? `(${w.totalReviews})` : ''}
        </span>
        {w.hourlyRateMin && (
          <span className="text-[var(--primary)] font-medium">{w.hourlyRateMin}+ ₺/sa</span>
        )}
      </div>
    </Link>
  );
}
