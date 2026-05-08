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

      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8 md:py-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 text-center sm:text-left">
          <div className="w-20 h-20 md:w-[120px] md:h-[120px] mx-auto sm:mx-0 rounded-full bg-white/20 flex items-center justify-center text-3xl md:text-5xl font-bold flex-shrink-0">
            {w.fullName?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-tight">
              {w.fullName}
              {w.identityVerified && (
                <span className="bg-white/20 text-xs md:text-sm px-2 py-1 rounded-full">✓ {dict.common.verified}</span>
              )}
            </h1>
            <p className="text-white/80 mt-1 text-sm md:text-base">{w.city || dict.common.all_turkey}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 mt-3 text-sm">
              {w.averageRating ? (
                <span>★ {Number(w.averageRating).toFixed(1)} ({w.totalReviews || 0} {dict.common.reviews})</span>
              ) : null}
              {(w as any).asWorkerSuccess ? <span>{(w as any).asWorkerSuccess} {dict.common.completed_jobs}</span> : null}
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
