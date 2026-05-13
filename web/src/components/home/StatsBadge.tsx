// Phase 176 — Marketplace stats hero badge (server component, graceful)
import { getPublicStats } from '@/lib/stats';

const fmt = new Intl.NumberFormat('tr-TR');

export default async function StatsBadge() {
  const stats = await getPublicStats();
  if (!stats) return null;

  const items = [
    { value: fmt.format(stats.workers), label: 'Usta' },
    { value: fmt.format(stats.completedJobs), label: 'Tamamlanan İş' },
    { value: fmt.format(stats.cities), label: 'Şehir' },
    { value: `%${Math.round(stats.successRate)}`, label: 'Memnuniyet' },
  ];

  return (
    <section className="bg-white border-b border-[var(--border)] py-8">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((it) => (
            <div key={it.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#FF5A1F] leading-tight">
                {it.value}
              </div>
              <div className="text-sm text-[#2D3E50]/70 mt-1 font-medium">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
