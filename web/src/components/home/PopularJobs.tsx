import Link from 'next/link';
import { slugify, type Worker } from '@/lib/api';

export default function PopularJobs({
  workers,
  localePrefix = '',
}: {
  workers: Worker[];
  localePrefix?: string;
}) {
  if (!workers.length) return null;

  return (
    <section className="bg-[var(--muted)]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="flex items-end justify-between mb-7 md:mb-10">
          <div>
            <h2 className="h-section text-2xl md:text-3xl text-[var(--secondary)]">
              Bugünün öne çıkan ustaları
            </h2>
            <p className="text-sm md:text-base text-gray-500 mt-1.5">
              Yüksek puanlı, doğrulanmış profesyoneller
            </p>
          </div>
          <Link
            href={`${localePrefix}/`}
            className="hidden sm:inline-flex items-center text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]"
          >
            Tümünü gör →
          </Link>
        </div>

        {/* Horizontal scroll on mobile, grid on md+ */}
        <div className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
          {workers.map((w) => (
            <WorkerCard key={w.id} w={w} localePrefix={localePrefix} className="flex-shrink-0 w-[78%] snap-start" />
          ))}
        </div>
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {workers.map((w) => (
            <WorkerCard key={w.id} w={w} localePrefix={localePrefix} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkerCard({
  w,
  localePrefix,
  className = '',
}: {
  w: Worker;
  localePrefix: string;
  className?: string;
}) {
  const cats = w.workerCategories || [];
  const initial = w.fullName?.[0]?.toUpperCase() || '?';
  const rating = w.averageRating ? Number(w.averageRating).toFixed(1) : null;

  return (
    <Link
      href={`${localePrefix}/usta/${slugify(w.fullName)}-${w.id}`}
      className={`card-soft p-4 md:p-5 flex flex-col gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[var(--secondary)] truncate">{w.fullName}</div>
          <div className="text-xs text-gray-500 truncate flex items-center gap-1">
            <span aria-hidden>📍</span>
            {w.city || 'Türkiye'}
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <div className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {cats.slice(0, 3).join(' · ')}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        {rating ? (
          <div className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--secondary)]">
            <span className="text-[var(--accent)]">★</span> {rating}
            <span className="text-gray-400 font-normal">
              ({w.totalReviews || 0})
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Yeni profil</span>
        )}
        <span className="chip">Doğrulanmış</span>
      </div>
    </Link>
  );
}
