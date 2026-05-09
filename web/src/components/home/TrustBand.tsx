const STATS = [
  { value: '5,000+', label: 'Doğrulanmış usta' },
  { value: '120,000+', label: 'Tamamlanan iş' },
  { value: '4.8★', label: 'Ortalama memnuniyet' },
  { value: '81', label: 'İl genelinde hizmet' },
];

export default function TrustBand() {
  return (
    <section className="bg-[var(--secondary)] text-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="h-display text-3xl md:text-4xl text-[var(--accent)]">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-white/70 mt-1.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
