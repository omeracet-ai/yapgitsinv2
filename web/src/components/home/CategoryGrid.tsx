import Link from 'next/link';
import { slugify } from '@/lib/api';

type Cat = { id: string; name: string; icon?: string; description?: string };

export default function CategoryGrid({
  categories,
  localePrefix = '',
}: {
  categories: Cat[];
  localePrefix?: string;
}) {
  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
      <div className="flex items-end justify-between mb-7 md:mb-10 gap-4">
        <div>
          <h2 className="h-section text-2xl md:text-3xl text-[var(--secondary)]">
            Popüler kategoriler
          </h2>
          <p className="text-sm md:text-base text-gray-500 mt-1.5">
            En çok tercih edilen hizmetlere göz atın
          </p>
        </div>
        <Link
          href={`${localePrefix}/ara`}
          className="hidden sm:inline-flex items-center text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          Tümünü gör →
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`${localePrefix}/${slugify(c.name)}`}
            className="card-soft group p-4 md:p-5 flex flex-col items-center text-center gap-2 md:gap-3 min-h-[120px] md:min-h-[140px] justify-center"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center text-2xl md:text-3xl group-hover:bg-[var(--primary-light)] transition-colors">
              {c.icon || '🛠️'}
            </div>
            <div className="font-semibold text-[13px] md:text-sm text-[var(--secondary)] leading-tight">
              {c.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
