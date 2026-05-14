import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import MarketplaceStats from '@/components/home/MarketplaceStats';

type SearchCat = { name: string; slug: string; icon?: string };

export interface HeroStats {
  totalJobs: number;
  totalWorkers: number;
  completedJobs: number;
  totalCategories: number;
}

export default function Hero({
  searchCats,
  cities,
  localePrefix = '',
  stats,
}: {
  searchCats: SearchCat[];
  cities: string[];
  localePrefix?: string;
  stats?: HeroStats;
}) {
  return (
    <section className="relative overflow-hidden hero-gradient text-white">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-[var(--accent)]/20 blur-3xl"
      />

      <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-24 relative">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs md:text-sm font-semibold tracking-wide">
            <span aria-hidden>⚡</span>
            5,000+ onaylı usta · 81 ilde hizmet
          </span>
          <h1 className="h-display mt-5 text-4xl sm:text-5xl md:text-6xl">
            Halletmek istediğiniz <br className="hidden sm:block" />
            <span className="text-[#FFE6DC]">her iş için doğru usta.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            Temizlikten tadilata, tesisattan nakliyeye — ilan açın, dakikalar içinde teklif alın.
            Türkiye&apos;nin en hızlı hizmet pazarı.
          </p>

          {/* Search bar shell — Airtasker style chunky pill */}
          <div className="mt-8 mx-auto max-w-2xl">
            <div className="bg-white rounded-2xl md:rounded-full p-2 shadow-2xl shadow-black/10">
              <SearchBar
                cats={searchCats}
                cities={cities}
                localePrefix={localePrefix}
                placeholder="Ne yaptırmak istiyorsunuz? Ör: temizlik, elektrikçi..."
              />
            </div>
          </div>

          {stats && (
            <MarketplaceStats
              totalJobs={stats.totalJobs}
              totalWorkers={stats.totalWorkers}
              completedJobs={stats.completedJobs}
              totalCategories={stats.totalCategories}
            />
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-center gap-3">
            <Link href={`${localePrefix}/ilan`} className="btn-primary !bg-white !text-[var(--primary-dark)] !shadow-none hover:!bg-[var(--primary-soft)]">
              Ücretsiz İlan Ver →
            </Link>
            <a
              href="https://yapgitsin.tr/app?ref=usta-ol"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Usta Olarak Katıl
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
