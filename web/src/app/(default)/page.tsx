import Link from 'next/link';
import { getCategories, getWorkers, slugify, unwrap, TR_CITIES } from '@/lib/api';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import Hero from '@/components/home/Hero';
import CategoryGrid from '@/components/home/CategoryGrid';
import PopularJobs from '@/components/home/PopularJobs';
import HowItWorks from '@/components/home/HowItWorks';
import TrustBand from '@/components/home/TrustBand';

export const revalidate = 3600;

export default async function HomePage() {
  const [cats, workersResp] = await Promise.all([
    getCategories(),
    getWorkers({ limit: '8' }),
  ]);
  const allCats = cats || [];
  const gridCats = allCats.slice(0, 12);
  const workers = unwrap(workersResp).slice(0, 8);
  const searchCats = allCats.map((c) => ({
    name: c.name,
    slug: slugify(c.name),
    icon: c.icon,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([{ name: 'Anasayfa', url: '/' }])),
        }}
      />

      <Hero searchCats={searchCats} cities={[...TR_CITIES]} />

      <CategoryGrid categories={gridCats} />

      <PopularJobs workers={workers} />

      <HowItWorks />

      <TrustBand />

      {/* Quick lead form */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="max-w-2xl mx-auto card-soft p-6 md:p-8">
          <LeadForm
            source="landing"
            title="Hızlı iletişim"
            subtitle="Aradığınız hizmeti yazın, doğru ustayla biz sizi buluşturalım."
          />
        </div>
      </section>

      {/* Cities */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 pb-16 md:pb-24">
        <h2 className="h-section text-xl md:text-2xl text-[var(--secondary)] mb-5 md:mb-6">
          Hizmet verdiğimiz şehirler
        </h2>
        <div className="flex flex-wrap gap-2">
          {TR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/temizlik/${slugify(city)}`}
              className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm text-[var(--secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors min-h-[40px] inline-flex items-center"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Sticky FAB — mobile only */}
      <Link href="/ilan" className="fab md:hidden" aria-label="Ücretsiz ilan ver">
        <span aria-hidden>＋</span> İlan Ver
      </Link>
    </>
  );
}
