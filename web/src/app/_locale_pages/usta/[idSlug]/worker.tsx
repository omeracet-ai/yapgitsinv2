import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorker, getWorkers, unwrap, parseSlugId, slugify, type Worker } from '@/lib/api';
import { jsonLd, breadcrumbLD, clip } from '@/lib/seo';
import { personWithReviewsLD } from '@/lib/jsonld';
import LeadForm from '@/components/LeadForm';
import WorkerReviews from '@/components/WorkerReviews';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import ResponsiveImage from '@/components/ResponsiveImage';

export async function getWorkerStaticSlugs(): Promise<string[]> {
  const workers = unwrap(await getWorkers({ limit: '100' })).slice(0, 100);
  return workers.length > 0
    ? workers.map((w: Worker) => `${slugify(w.fullName || 'usta')}-${w.id}`)
    : ['bulunamadi'];
}

export async function buildWorkerMetadata(L: Locale, idSlug: string): Promise<Metadata> {
  const dict = getDict(L);
  const id = parseSlugId(idSlug);
  const w = await getWorker(id);
  if (!w) return { title: dict.common.worker_not_found };
  const cats = (w.workerCategories || []).join(', ');
  const title = `${w.fullName} — ${cats || dict.site.title}`;
  const desc = clip(`${w.fullName} — ${w.city || dict.common.all_turkey}: ${cats || ''}. ${w.workerBio || ''}`, 158);
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: 'profile', images: w.profileImageUrl ? [w.profileImageUrl] : ['/og-default.png'] },
  };
}

export default async function renderWorker(L: Locale, idSlug: string) {
  const dict = getDict(L);
  const id = parseSlugId(idSlug);
  const w = await getWorker(id);
  if (!w) return notFound();

  const cats: string[] = w.workerCategories || [];
  const reviews: any[] = (w as any).reviews || [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(personWithReviewsLD(w, reviews)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([
            { name: dict.breadcrumb.home, url: localePath(L, '/') },
            { name: dict.breadcrumb.workers, url: localePath(L, '/') },
            { name: w.fullName, url: localePath(L, `/usta/${idSlug}`) },
          ])),
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pt-4">
        <Breadcrumbs
          items={[
            { label: dict.breadcrumb.home, href: localePath(L, '/') },
            { label: dict.breadcrumb.workers, href: localePath(L, '/') },
            { label: w.fullName },
          ]}
        />
      </div>

      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 30%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="relative container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-10 md:py-14 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 text-center sm:text-left">
          <div className="w-28 h-28 md:w-[140px] md:h-[140px] mx-auto sm:mx-0 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-4xl md:text-5xl font-bold flex-shrink-0 overflow-hidden shadow-xl">
            {w.profileImageUrl ? (
              <ResponsiveImage
                src={w.profileImageUrl}
                alt={w.fullName}
                width={140}
                height={140}
                sizes="(max-width: 768px) 112px, 140px"
                priority
                className="w-full h-full object-cover"
              />
            ) : (
              w.fullName?.[0] || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-tight tracking-tight">
              {w.fullName}
              {w.identityVerified && (
                <span className="bg-[var(--accent)] text-white text-xs md:text-sm px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                  ✓ {dict.common.verified}
                </span>
              )}
            </h1>
            <p className="text-white/80 mt-1.5 text-base">{w.city || dict.common.all_turkey}</p>
            {/* Trust signals row — Airtasker style badges */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              {w.averageRating ? (
                <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">★</span>
                  <span className="font-bold">{Number(w.averageRating).toFixed(1)}</span>
                  <span className="text-white/70">({w.totalReviews || 0} {dict.common.reviews})</span>
                </span>
              ) : null}
              {(w as any).asWorkerSuccess ? (
                <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
                  <span className="text-[var(--accent)]">✓</span>
                  <span className="font-bold">{(w as any).asWorkerSuccess}</span>
                  <span className="text-white/70">{dict.common.completed_jobs}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-6 md:py-8 grid md:grid-cols-3 gap-4 md:gap-6 pb-24 md:pb-8">
        <div className="md:col-span-2 space-y-6">
          {w.workerBio && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h2 className="font-bold text-[var(--secondary)] mb-2">{dict.common.about}</h2>
              <p className="text-gray-700 leading-relaxed text-sm">{w.workerBio}</p>
            </div>
          )}
          <WorkerReviews
            reviews={reviews}
            averageRating={Number(w.averageRating || 0)}
            totalReviews={w.totalReviews || reviews.length}
            heading={dict.common.reviews}
          />
        </div>
        <aside className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-bold text-[var(--secondary)] mb-2">{dict.common.categories_label}</h3>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Link key={c} href={localePath(L, `/${slugify(c)}`)} className="bg-[var(--primary-light)] text-[var(--primary)] px-3 py-1 rounded-full text-xs">{c}</Link>
              ))}
            </div>
          </div>
          {(w.hourlyRateMin || w.hourlyRateMax) && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-bold text-[var(--secondary)] mb-2">{dict.common.rate}</h3>
              <p className="text-gray-700 text-sm">{w.hourlyRateMin || '—'} – {w.hourlyRateMax || '—'} TL / {dict.common.hour}</p>
            </div>
          )}
        </aside>
      </section>

      <section id="iletisim" className="container mx-auto max-w-2xl px-4 md:px-6 lg:px-8 pb-10 md:pb-16">
        <LeadForm source="worker_profile" targetWorkerId={w.id} category={cats[0]} title={`${w.fullName} — ${dict.nav.contact}`} subtitle={dict.lead.worker_lead_sub} />
      </section>
    </>
  );
}
