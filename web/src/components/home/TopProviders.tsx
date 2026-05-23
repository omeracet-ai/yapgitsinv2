import Link from 'next/link';
import { slugify, type Worker } from '@/lib/api';

/**
 * Phase 263 — "Öne Çıkan En İyi Ustalar" reklam vitrini.
 * Veritabanından akıllı/adil sıralamayla (Wilson + Bayesian, sortBy=smart) gelen
 * en iyi 3 usta. Ana sayfada güven + dönüşüm odaklı reklam alanı.
 */
export default function TopProviders({ workers }: { workers: Worker[] }) {
  if (!workers || workers.length === 0) return null;

  return (
    <section className="bg-[var(--muted)] py-14 md:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-wide text-[var(--accent)] mb-2">
            ⭐ Öne Çıkan
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-2">
            En İyi Ustalar
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Puan ve yorum güvenilirliğine göre akıllı sıralanmış, en çok tercih
            edilen ustalar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {workers.slice(0, 3).map((w, i) => (
            <div
              key={w.id}
              className="relative bg-white border border-[var(--border)] rounded-2xl p-5 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                #{i + 1} En İyi
              </span>
              <Link
                href={`/usta/${slugify(w.fullName)}-${w.id}`}
                className="flex flex-col items-center text-center gap-2 mb-3 mt-2"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-light)] ring-2 ring-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] font-bold text-2xl flex-shrink-0">
                  {w.fullName?.[0] || '?'}
                </div>
                <div className="min-w-0 w-full">
                  <div className="font-bold truncate text-[var(--secondary)] flex items-center justify-center gap-1">
                    {w.fullName}
                    {w.identityVerified && (
                      <span title="Doğrulanmış" className="text-[var(--primary)] text-sm flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {w.city || 'Türkiye geneli'}
                  </div>
                </div>
              </Link>

              <div className="text-xs text-gray-600 line-clamp-2 mb-3 min-h-[32px] text-center">
                {(w.workerCategories || []).join(' · ')}
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
                {w.averageRating ? (
                  <span className="text-xs text-[var(--accent)] font-bold">
                    ★ {w.averageRating.toFixed(1)}{' '}
                    <span className="text-gray-400 font-normal">
                      ({w.totalReviews || 0})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Yeni</span>
                )}
                <Link
                  href={`/usta/${slugify(w.fullName)}-${w.id}`}
                  className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
                >
                  Profili Gör →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/usta"
            className="inline-block text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
          >
            Tüm ustaları gör →
          </Link>
        </div>
      </div>
    </section>
  );
}
