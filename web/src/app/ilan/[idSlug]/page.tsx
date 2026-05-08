import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob, parseSlugId, slugify } from '@/lib/api';
import { jsonLd, jobPostingLD, breadcrumbLD, clip } from '@/lib/seo';

export const revalidate = 3600;

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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">Anasayfa</Link> /{' '}
            <Link href={`/${slugify(job.category)}`} className="hover:underline">{job.category}</Link>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-3">
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

      <section className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {job.photos?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt={`${job.title} - ${i + 1}`}
                  className="rounded-lg border border-[var(--border)] aspect-square object-cover"
                />
              ))}
            </div>
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
    </>
  );
}
