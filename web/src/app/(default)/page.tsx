import Link from 'next/link';
import { getCategories, getWorkers, slugify, unwrap, getPublicStats } from '@/lib/api';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import Hero from '@/components/home/Hero';
import CategoryGrid from '@/components/home/CategoryGrid';
import PopularJobs from '@/components/home/PopularJobs';
import HowItWorks from '@/components/home/HowItWorks';
import TrustBand from '@/components/home/TrustBand';
import JobsMapWrapper from '@/components/map/JobsMapWrapper';

export const revalidate = 3600;

export default async function HomePage() {
  const [cats, workersResp, statsData] = await Promise.all([
    getCategories(),
    getWorkers({ limit: '8' }),
    getPublicStats(),
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

      <Hero searchCats={searchCats} cities={[]} stats={statsData ?? undefined} />

      <CategoryGrid categories={gridCats} />

      <PopularJobs workers={workers} />

      <HowItWorks />

      <TrustBand />

      {/* Active jobs map */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Türkiye Genelinde Aktif İlanlar
          </h2>
          <p className="mt-2 text-gray-500 text-sm md:text-base">
            Haritadan size en yakın hizmet ilanlarını keşfedin
          </p>
        </div>
        <JobsMapWrapper />
      </section>

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

      {/* Sticky FAB — mobile only */}
      <Link href="/ilan" className="fab md:hidden" aria-label="Ücretsiz ilan ver">
        <span aria-hidden>＋</span> İlan Ver
      </Link>
    </>
  );
}
