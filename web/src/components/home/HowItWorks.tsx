const STEPS = [
  {
    n: 1,
    icon: '📝',
    title: 'İlanınızı açın',
    body: 'Ne yaptırmak istediğinizi anlatın, fotoğraf ekleyin. Ücretsizdir.',
  },
  {
    n: 2,
    icon: '💬',
    title: 'Teklifleri karşılaştırın',
    body: 'Doğrulanmış ustalar dakikalar içinde fiyat ve müsaitlik gönderir.',
  },
  {
    n: 3,
    icon: '✅',
    title: 'En uygun ustayı seçin',
    body: 'Profil, puan ve yorumları inceleyin; ödemeyi platform üzerinden yapın.',
  },
];

export default function HowItWorks() {
  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
        <h2 className="h-section text-2xl md:text-3xl text-[var(--secondary)]">
          Nasıl çalışıyor?
        </h2>
        <p className="text-sm md:text-base text-gray-500 mt-2">
          3 basit adımda işinizi halledin
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 md:gap-6">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="card-soft p-6 md:p-7 text-center relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--primary)] text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
              {s.n}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center text-3xl mx-auto mt-3 mb-4">
              {s.icon}
            </div>
            <h3 className="font-bold text-lg text-[var(--secondary)] mb-2">
              {s.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
