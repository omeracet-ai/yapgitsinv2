import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCustomer, getJobs, unwrap, parseSlugId, slugify } from '@/lib/api';
import { jsonLd, breadcrumbLD, clip } from '@/lib/seo';
import Breadcrumbs from '@/components/Breadcrumbs';
import { type Locale, getDict, localePath } from '@/i18n';

// Phase 133 — Pre-render last 100 customers (derived from public jobs).
export async function getCustomerStaticSlugs(): Promise<string[]> {
  const jobs = unwrap(await getJobs({ limit: '100' })).slice(0, 100);
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const j of jobs) {
    const cid = (j as any).customerId;
    const cname = (j as any).customer?.fullName || 'musteri';
    if (cid && !seen.has(cid)) {
      seen.add(cid);
      slugs.push(`${slugify(cname)}-${cid}`);
    }
  }
  return slugs.length > 0 ? slugs : ['bulunamadi'];
}

function personLD(c: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: c.fullName,
    image: c.profileImageUrl || undefined,
    identifier: c.id,
  };
}

export async function buildCustomerMetadata(
  L: Locale,
  idSlug: string,
): Promise<Metadata> {
  const id = parseSlugId(idSlug);
  const c = await getCustomer(id);
  if (!c) return { title: 'Müşteri bulunamadı' };
  const title = `${c.fullName} — Müşteri Profili`;
  const desc = clip(
    `${c.fullName} — Yapgitsin müşterisi. ${c.completedJobsCount || 0} tamamlanan iş, %${c.customerSuccessRate || 0} başarı oranı.`,
    158,
  );
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      images: c.profileImageUrl ? [c.profileImageUrl] : ['/og-default.png'],
    },
  };
}

export default async function renderCustomer(L: Locale, idSlug: string) {
  const dict = getDict(L);
  const id = parseSlugId(idSlug);
  const c = await getCustomer(id);
  if (!c) return notFound();

  const reviews: any[] = c.reviewsReceivedAsCustomer || [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(personLD(c)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: dict.breadcrumb.home, url: localePath(L, '/') },
              { name: 'Müşteriler', url: localePath(L, '/') },
              { name: c.fullName, url: localePath(L, `/musteri/${idSlug}`) },
            ]),
          ),
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pt-4">
        <Breadcrumbs
          items={[
            { label: dict.breadcrumb.home, href: localePath(L, '/') },
            { label: 'Müşteriler', href: localePath(L, '/') },
            { label: c.fullName },
          ]}
        />
      </div>

      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8 md:py-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 text-center sm:text-left">
          <div className="w-20 h-20 md:w-[120px] md:h-[120px] mx-auto sm:mx-0 rounded-full bg-white/20 flex items-center justify-center text-3xl md:text-5xl font-bold flex-shrink-0 overflow-hidden">
            {c.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.profileImageUrl}
                alt={c.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              c.fullName?.[0] || '?'
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 leading-tight">
              {c.fullName}
              {c.identityVerified && (
                <span className="bg-white/20 text-xs md:text-sm px-2 py-1 rounded-full">
                  ✓ Doğrulanmış
                </span>
              )}
            </h1>
            {c.joinedAt && (
              <p className="text-white/80 mt-1 text-sm md:text-base">
                Üyelik: {new Date(c.joinedAt).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-6 md:py-8 grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">
            {c.completedJobsCount || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Tamamlanan İş</div>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">
            %{c.customerSuccessRate || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Başarı Oranı</div>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">
            {reviews.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Yorum</div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pb-10 md:pb-16">
        <div className="bg-white border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-bold text-[var(--secondary)] mb-3">
            Bu Müşteriye Verilen Yorumlar
          </h2>
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-sm">Henüz yorum yok.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {reviews.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--secondary)]">
                      {r.reviewerName}
                    </span>
                    <span className="text-sm text-[var(--accent)]">
                      ★ {r.rating}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-gray-700 text-sm mt-1">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
