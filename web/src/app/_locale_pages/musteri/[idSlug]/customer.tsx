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
  const monthly: any[] = (c as any).monthlyActivity || [];
  const topCats: any[] = (c as any).topCategories || [];
  const avgBudget: number = (c as any).avgBudget || 0;
  const lastJobs: any[] = (c as any).lastCompletedJobs || [];
  const maxMonth = monthly.reduce(
    (a: number, m: any) => Math.max(a, Number(m.count) || 0),
    0,
  );
  const maxBar = maxMonth === 0 ? 1 : maxMonth;

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

      {/* Phase 145 — Aktivite (son 6 ay) */}
      <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pb-6 md:pb-8">
        <div className="bg-white border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-bold text-[var(--secondary)] mb-3">
            Aktivite (Son 6 Ay)
          </h2>
          <div className="flex items-end gap-2 h-28">
            {monthly.map((m: any) => {
              const count = Number(m.count) || 0;
              const month = String(m.month || '');
              const mm = month.length >= 7 ? month.substring(5, 7) : '';
              const h = Math.max(2, (count / maxBar) * 80);
              return (
                <div
                  key={month}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <span className="text-[11px] font-bold text-[var(--secondary)]">
                    {count}
                  </span>
                  <div
                    className="w-full bg-[var(--primary)] rounded-md mt-1"
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[10px] text-gray-500 mt-1">{mm}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {(topCats.length > 0 || avgBudget > 0) && (
        <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pb-6 md:pb-8 grid md:grid-cols-2 gap-4 md:gap-6">
          {topCats.length > 0 && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-5">
              <h2 className="font-bold text-[var(--secondary)] mb-3">
                En Sık Çalıştığı Kategoriler
              </h2>
              <div className="flex flex-wrap gap-2">
                {topCats.map((tc: any) => (
                  <span
                    key={tc.category}
                    className="bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold px-3 py-1 rounded-full"
                  >
                    {tc.category} ({tc.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {avgBudget > 0 && (
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-5 flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <div className="text-xs text-gray-600">Ortalama Bütçe</div>
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {avgBudget}₺
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {lastJobs.length > 0 && (
        <section className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8 pb-6 md:pb-8">
          <div className="bg-white border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-bold text-[var(--secondary)] mb-3">
              Son Tamamlanan İşler
            </h2>
            <ul className="divide-y divide-[var(--border)]">
              {lastJobs.map((j: any) => (
                <li key={j.id} className="py-2 flex items-center gap-3">
                  <span className="text-[var(--success,#00C9A7)]">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--secondary)] truncate">
                      {j.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {j.category}
                      {j.completedAt
                        ? ` · ${new Date(j.completedAt).toLocaleDateString('tr-TR')}`
                        : ''}
                    </div>
                  </div>
                  {Number(j.budget) > 0 && (
                    <span className="text-sm font-bold text-[var(--primary)]">
                      {Number(j.budget)}₺
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
