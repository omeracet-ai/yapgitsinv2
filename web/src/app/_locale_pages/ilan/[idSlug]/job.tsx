import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob, getJobs, unwrap, parseSlugId, slugify, type Job } from '@/lib/api';
import { jsonLd, jobPostingLD, breadcrumbLD, clip } from '@/lib/seo';
import LeadForm from '@/components/LeadForm';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import ResponsiveImage from '@/components/ResponsiveImage';

export async function getJobStaticSlugs(): Promise<string[]> {
  const jobs = unwrap(await getJobs({ status: 'open', limit: '100' })).slice(0, 100);
  return jobs.length > 0
    ? jobs.map((j: Job) => `${slugify(j.title || 'ilan')}-${j.id}`)
    : ['bulunamadi'];
}

export async function buildJobMetadata(L: Locale, idSlug: string): Promise<Metadata> {
  const dict = getDict(L);
  const job = await getJob(parseSlugId(idSlug));
  if (!job) return { title: dict.common.job_not_found };
  const title = clip(`${job.title} — ${job.location}`, 60);
  const desc = clip(job.description, 158);
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: job.photos?.[0] ? [job.photos[0]] : ['/og-default.png'] },
  };
}

export default async function renderJob(L: Locale, idSlug: string) {
  const dict = getDict(L);
  const job = await getJob(parseSlugId(idSlug));
  if (!job) return notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobPostingLD(job)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(breadcrumbLD([
            { name: dict.breadcrumb.home, url: localePath(L, '/') },
            { name: job.category, url: localePath(L, `/${slugify(job.category)}`) },
            { name: job.title, url: localePath(L, `/ilan/${idSlug}`) },
          ])),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <Breadcrumbs
            items={[
              { label: dict.breadcrumb.home, href: localePath(L, '/') },
              { label: (dict.breadcrumb as { jobs?: string }).jobs || 'Jobs', href: localePath(L, `/${slugify(job.category)}`) },
              { label: job.title },
            ]}
          />
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-[var(--secondary)] mb-3 leading-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>📍 {job.location}</span>
            <span>📂 {job.category}</span>
            {job.budgetMin && job.budgetMax && (
              <span className="text-[var(--primary)] font-medium">{job.budgetMin}-{job.budgetMax} TL</span>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8 grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 space-y-4 md:space-y-5">
          {job.photos?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((p, i) => (
                // Phase 96: AVIF/WebP/JPEG. First photo above-the-fold → priority.
                <ResponsiveImage
                  key={i}
                  src={p}
                  alt={`${job.title} - ${i + 1}`}
                  width={400}
                  height={400}
                  sizes="(max-width: 768px) 33vw, 240px"
                  priority={i === 0}
                  className="rounded-lg border border-[var(--border)] aspect-square object-cover w-full h-full"
                />
              ))}
            </div>
          ) : null}
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-bold text-[var(--secondary)] mb-2">{dict.common.details}</h2>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{job.description}</p>
          </div>
        </div>
        <aside>
          {job.customer && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-bold text-[var(--secondary)] mb-3">{dict.common.owner}</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold">
                  {job.customer.fullName?.[0] || '?'}
                </div>
                <div className="font-medium">{job.customer.fullName}</div>
              </div>
              <p className="mt-4 text-xs text-gray-500">{dict.common.no_offers}</p>
            </div>
          )}
        </aside>
      </section>

      <section className="container mx-auto max-w-2xl px-4 md:px-6 lg:px-8 pb-10 md:pb-16">
        <LeadForm source="job_detail" category={job.category} title={dict.lead.job_lead_title} subtitle={dict.lead.job_lead_sub} />
      </section>
    </>
  );
}
