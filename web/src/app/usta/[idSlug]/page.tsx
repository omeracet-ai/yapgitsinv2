import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorker, parseSlugId, slugify } from '@/lib/api';
import { jsonLd, personLD, breadcrumbLD, clip } from '@/lib/seo';

export const revalidate = 3600;

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
  const w = await getWorker(id);
  if (!w) return notFound();

  const cats: string[] = w.workerCategories || [];
  const reviews: any[] = w.reviews || [];

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

      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
            {w.fullName?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {w.fullName}
              {w.identityVerified && (
                <span className="bg-white/20 text-sm px-2 py-1 rounded-full">✓ Doğrulanmış</span>
              )}
            </h1>
            <p className="text-white/80 mt-1">{w.city || 'Türkiye'}</p>
            <div className="flex gap-3 mt-3 text-sm">
              {w.averageRating ? (
                <span>★ {Number(w.averageRating).toFixed(1)} ({w.totalReviews || 0} yorum)</span>
              ) : null}
              {w.asWorkerSuccess ? <span>{w.asWorkerSuccess} tamamlanan iş</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
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
        </aside>
      </section>
    </>
  );
}
