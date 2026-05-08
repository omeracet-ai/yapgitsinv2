import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-[var(--primary)] mb-3">404</h1>
      <h2 className="text-2xl font-semibold text-[var(--secondary)] mb-3">
        Sayfa bulunamadı
      </h2>
      <p className="text-gray-600 mb-6">
        Aradığınız sayfa kaldırılmış veya adres değiştirilmiş olabilir.
      </p>
      <Link
        href="/"
        className="inline-block bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-6 py-3 rounded-lg font-medium"
      >
        Anasayfaya dön
      </Link>
    </section>
  );
}
