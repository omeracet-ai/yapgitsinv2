import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob, getJobs, unwrap, parseSlugId, slugify, type Job } from '@/lib/api';
import { jsonLd, jobPostingLD, breadcrumbLD, clip, alternateLinks } from '@/lib/seo';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';

// Static export: pre-render top 100 open job listings at build time.
// Backend offline → empty list, sitemap also skips. Rebuild after data changes.
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ idSlug: string }[]> {
  const jobs = unwrap(await getJobs({ status: 'open', limit: '100' })).slice(0, 100);
  const params = jobs.map((j: Job) => ({
    idSlug: `${slugify(j.title || 'ilan')}-${j.id}`,
  }));
  // Next.js requires at least one entry when dynamicParams=false; emit a
  // placeholder that resolves to 404 so the build still succeeds offline.
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
  const job = await getJob(parseSlugId(idSlug));
  if (!job) return { title: 'İlan bulunamadı' };
  const title = clip(`${job.title} — ${job.location}`, 60);
  const desc = clip(job.description, 158);
  return {
    title,
    description: desc,
    alternates: alternateLinks(`/ilan/${idSlug}`),
    openGraph: {
      title,
      description: desc,
      images: job.photos?.[0] ? [job.photos[0]] : ['/og-default.png'],
    },
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { idSlug } = await params;
  const job = await getJob(parseSlugId(idSlug));
  if (!job) return notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jobPostingLD(job)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: 'Anasayfa', url: '/' },
              { name: job.category, url: `/${slugify(job.category)}` },
              { name: job.title, url: `/ilan/${idSlug}` },
            ]),
          ),
        }}
      />

      <section className="bg-white border-b border-[var(--border)]">
        <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <Breadcrumbs items={[
            { label: 'Anasayfa', href: '/' },
            { label: job.category, href: `/${slugify(job.category)}` },
            { label: job.title },
          ]} />
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-[var(--secondary)] mb-3 leading-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>📍 {job.location}</span>
            <span>📂 {job.category}</span>
            {job.budgetMin && job.budgetMax && (
              <span className="text-[var(--primary)] font-medium">
                {job.budgetMin}-{job.budgetMax} TL
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-6 md:py-8 grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 space-y-4 md:space-y-5">
          {job.photos?.length ? (
            <>
              {/* Mobile: swipe carousel */}
              <div className="md:hidden -mx-4 px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                {job.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p}
                    alt={`${job.title} - ${i + 1}`}
                    className="rounded-lg border border-[var(--border)] w-[88%] aspect-[4/3] object-cover snap-start flex-shrink-0"
                    loading="lazy"
                  />
                ))}
              </div>
              {/* Desktop: grid */}
              <div className="hidden md:grid grid-cols-3 gap-2">
                {job.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p}
                    alt={`${job.title} - ${i + 1}`}
                    className="rounded-lg border border-[var(--border)] aspect-square object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </>
          ) : null}
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-bold text-[var(--secondary)] mb-2">İş Detayları</h2>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
              {job.description}
            </p>
          </div>
        </div>
        <aside>
          {job.customer && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h3 className="font-bold text-[var(--secondary)] mb-3">İlan Sahibi</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold">
                  {job.customer.fullName?.[0] || '?'}
                </div>
                <div className="font-medium">{job.customer.fullName}</div>
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Teklif vermek için Yapgitsin mobil uygulamasını indirin.
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className="container mx-auto max-w-2xl px-4 md:px-6 lg:px-8 pb-10 md:pb-16">
        <LeadForm
          source="job_detail"
          category={job.category}
          title="Bu işe teklif vermek için iletişime geçin"
          subtitle="Bilgilerinizi bırakın, ekibimiz sizi ilan sahibiyle buluştursun."
        />
      </section>
    </>
  );
}
