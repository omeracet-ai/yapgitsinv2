import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorker, getWorkers, unwrap, parseSlugId, slugify, type Worker } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import { jsonLd, personLD, breadcrumbLD, clip, alternateLinks } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';

// Phase 211 — fetch public availability slots for a worker
async function getWorkerAvailability(id: string): Promise<{ dayOfWeek: number; startTime: string; endTime: string }[]> {
  try {
    const { API_URL } = process.env;
    const base = API_URL || 'https://api.yapgitsin.tr';
    const res = await fetch(`${base}/users/${id}/availability`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const DOW_LABELS: Record<number, string> = {
  1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt', 0: 'Paz',
};

// Static export: pre-render top 100 worker profiles at build time.
// If backend is unreachable during build, returns [] and no worker pages emit
// (sitemap also skips them). Mobile/admin app remains the source of truth.
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ idSlug: string }[]> {
  const workers = unwrap(await getWorkers({ limit: '100' })).slice(0, 100);
  const params = workers.map((w: Worker) => ({
    idSlug: `${slugify(w.fullName || 'usta')}-${w.id}`,
  }));
  if (params.length === 0) return [{ idSlug: 'bulunamadi' }];
  return params;
}

type Params = { idSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { idSlug } = await params;
  const id = parseSlugId(idSlug);
  const w = await getWorker(id);
  if (!w) return { title: 'Usta bulunamadı' };
  const cats = (w.workerCategories || []).join(', ');
  const title = `${w.fullName} — ${cats || 'Hizmet Sağlayıcı'}`;
  const desc = clip(
    `${w.fullName} — ${w.city || 'Türkiye'} bölgesinde ${cats || 'hizmet'} sağlayıcı. ${w.workerBio || 'Yapgitsin doğrulanmış üye.'}`,
    158,
  );
  return {
    title,
    description: desc,
    alternates: alternateLinks(`/usta/${idSlug}`),
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      images: w.profileImageUrl ? [w.profileImageUrl] : ['/og-default.png'],
    },
  };
}

export default async function WorkerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { idSlug } = await params;
  const id = parseSlugId(idSlug);
  const [w, availSlots] = await Promise.all([
    getWorker(id),
    getWorkerAvailability(id),
  ]);
  if (!w) return notFound();

  const cats: string[] = w.workerCategories || [];
  const reviews: any[] = w.reviews || [];
  const activeDows = new Set(availSlots.map((s) => s.dayOfWeek));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(personLD(w)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: 'Anasayfa', url: '/' },
              { name: 'Ustalar', url: '/' },
              { name: w.fullName, url: `/usta/${idSlug}` },
            ]),
          ),
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 md:px-6 pt-4">
        <Breadcrumbs items={[{ label: 'Anasayfa', href: '/' }, { label: 'Ustalar', href: '/usta' }, { label: w.fullName }]} />
      </div>

      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8 md:py-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 text-center sm:text-left">
          <div className="w-20 h-20 md:w-[120px] md:h-[120px] mx-auto sm:mx-0 rounded-full bg-white/20 flex items-center justify-center text-3xl md:text-5xl font-bold flex-shrink-0">
            {w.fullName?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-tight">
              {w.fullName}
              {w.identityVerified && (
                <span className="bg-white/20 text-xs md:text-sm px-2 py-1 rounded-full">✓ Doğrulanmış</span>
              )}
            </h1>
            <p className="text-white/80 mt-1 text-sm md:text-base">{w.city || 'Türkiye'}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 mt-3 text-sm">
              {w.averageRating ? (
                <span>★ {Number(w.averageRating).toFixed(1)} ({w.totalReviews || 0} yorum)</span>
              ) : null}
              {w.asWorkerSuccess ? <span>{w.asWorkerSuccess} tamamlanan iş</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-6 md:py-8 grid md:grid-cols-3 gap-4 md:gap-6 pb-24 md:pb-8">
        <div className="md:col-span-2 space-y-6">
          {w.workerBio && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h2 className="font-bold text-[var(--secondary)] mb-2">Hakkında</h2>
              <p className="text-gray-700 leading-relaxed text-sm">{w.workerBio}</p>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h2 className="font-bold text-[var(--secondary)] mb-3">Yorumlar</h2>
              <ul className="divide-y divide-[var(--border)]">
                {reviews.slice(0, 10).map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="text-sm text-[var(--accent)] font-medium">★ {r.rating}</div>
                    <p className="text-gray-700 text-sm">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-bold text-[var(--secondary)] mb-2">Kategoriler</h3>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Link
                  key={c}
                  href={`/${slugify(c)}`}
                  className="bg-[var(--primary-light)] text-[var(--primary)] px-3 py-1 rounded-full text-xs"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
          {(w.hourlyRateMin || w.hourlyRateMax) && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-bold text-[var(--secondary)] mb-2">Ücret</h3>
              <p className="text-gray-700 text-sm">
                {w.hourlyRateMin || '—'} – {w.hourlyRateMax || '—'} TL / saat
              </p>
            </div>
          )}
          {availSlots.length > 0 && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-bold text-[var(--secondary)] mb-3">Müsaitlik</h3>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4, 5, 6, 0] as const).map((dow) => {
                  const on = activeDows.has(dow);
                  const slot = availSlots.find((s) => s.dayOfWeek === dow);
                  return (
                    <div
                      key={dow}
                      title={on && slot ? `${slot.startTime} – ${slot.endTime}` : 'Müsait değil'}
                      className={`flex flex-col items-center px-2 py-1 rounded-lg text-xs font-semibold border ${
                        on
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}
                    >
                      <span>{DOW_LABELS[dow]}</span>
                      {on && slot && (
                        <span className="font-normal text-[10px] mt-0.5 text-green-600">
                          {slot.startTime}–{slot.endTime}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section id="iletisim" className="container mx-auto max-w-2xl px-4 md:px-6 lg:px-8 pb-10 md:pb-16">
        <LeadForm
          source="worker_profile"
          targetWorkerId={w.id}
          category={cats[0]}
          title={`${w.fullName} ile iletişime geçin`}
          subtitle="Bilgilerinizi bırakın, ekibimiz sizi en kısa sürede ustayla buluştursun."
        />
      </section>

      {/* Sticky mobile CTA — direct contact via app install */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--border)] px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <a
          href="#iletisim"
          className="flex items-center justify-center w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold rounded-lg min-h-[48px]"
        >
          İletişime Geç
        </a>
      </div>
    </>
  );
}
