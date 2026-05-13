import Link from 'next/link';

const POPULAR = [
  { slug: 'temizlik', name: 'Temizlik' },
  { slug: 'tadilat', name: 'Tadilat' },
  { slug: 'elektrikci', name: 'Elektrikçi' },
  { slug: 'tesisatci', name: 'Tesisatçı' },
  { slug: 'nakliye', name: 'Nakliye' },
];

export default function NotFound() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-20 md:py-28 text-center">
      <div className="text-7xl md:text-8xl font-extrabold text-[var(--primary)] mb-2 leading-none">
        404
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-3">
        Aradığınız sayfayı bulamadık
      </h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Sayfa kaldırılmış ya da adres değişmiş olabilir. Aşağıdaki popüler hizmetlere göz atın
        veya anasayfaya dönün.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {POPULAR.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="bg-white border border-[var(--border)] px-4 py-2 rounded-full text-sm text-[var(--secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="inline-block bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-6 py-3 rounded-full font-semibold shadow-md shadow-[var(--primary)]/25 transition-colors"
      >
        Anasayfaya dön
      </Link>
    </section>
  );
}
