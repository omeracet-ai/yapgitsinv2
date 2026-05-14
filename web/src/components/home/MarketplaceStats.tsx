type StatItem = {
  label: string;
  value: number;
  suffix?: string;
};

export default function MarketplaceStats({
  totalJobs,
  totalWorkers,
  completedJobs,
  totalCategories,
}: {
  totalJobs: number;
  totalWorkers: number;
  completedJobs: number;
  totalCategories: number;
}) {
  const stats: StatItem[] = [
    { label: 'Toplam İlan', value: totalJobs, suffix: '+' },
    { label: 'Aktif Usta', value: totalWorkers, suffix: '+' },
    { label: 'Tamamlanan İş', value: completedJobs, suffix: '+' },
    { label: 'Hizmet Kategorisi', value: totalCategories },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-5 text-center"
        >
          <p className="text-3xl font-extrabold text-white leading-none">
            {s.value.toLocaleString('tr-TR')}
            {s.suffix}
          </p>
          <p className="mt-1.5 text-xs text-white/75 font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
