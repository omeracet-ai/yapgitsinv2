import type { Metadata } from 'next';
import { getWorkers, unwrap, type Worker } from '@/lib/api';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import WorkerListClient from '@/components/WorkerListClient';

const COPY: Record<Locale, { title: string; desc: string; h1: string; sub: string; joinTitle: string; joinBody: string }> = {
  tr: {
    title: 'Ustalar — Onaylı Hizmet Sağlayıcılar | Yapgitsin',
    desc: 'Yapgitsin üzerindeki onaylı ustaları keşfedin. Şehir, kategori ve puana göre filtreleyin, doğru ustayı bulun.',
    h1: 'Ustalar',
    sub: 'Onaylı hizmet sağlayıcıları inceleyin; şehir, kategori ve puana göre filtreleyin.',
    joinTitle: 'Usta mısınız?',
    joinBody: 'Yapgitsin mobil uygulamasını indirin, profilinizi oluşturun ve yakınınızdaki işlerden teklif vermeye başlayın.',
  },
  en: {
    title: 'Pros — Verified Service Providers | Yapgitsin',
    desc: 'Browse verified pros on Yapgitsin. Filter by city, category and rating to find the right professional.',
    h1: 'Pros',
    sub: 'Browse verified service providers; filter by city, category and rating.',
    joinTitle: 'Are you a pro?',
    joinBody: 'Download the Yapgitsin mobile app, build your profile and start sending quotes for jobs near you.',
  },
  az: {
    title: 'Ustalar — Təsdiqlənmiş Xidmət Təminatçıları | Yapgitsin',
    desc: 'Yapgitsin-dəki təsdiqlənmiş ustalarla tanış olun. Şəhər, kateqoriya və reytinqə görə süzün, doğru ustanı tapın.',
    h1: 'Ustalar',
    sub: 'Təsdiqlənmiş xidmət təminatçılarını nəzərdən keçirin; şəhər, kateqoriya və reytinqə görə süzün.',
    joinTitle: 'Ustasınız?',
    joinBody: 'Yapgitsin mobil tətbiqini yükləyin, profilinizi yaradın və yaxınlığınızdakı işlərə təkliflər göndərməyə başlayın.',
  },
};

export function buildWorkersMetadata(L: Locale): Metadata {
  const c = COPY[L] || COPY.tr;
  return { title: c.title, description: c.desc, robots: { index: true, follow: true } };
}

export default async function renderWorkers(L: Locale) {
  const dict = getDict(L);
  const c = COPY[L] || COPY.tr;
  const workers: Worker[] = unwrap(await getWorkers({ limit: '60' }));
  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 max-w-6xl">
      <Breadcrumbs items={[{ label: dict.breadcrumb.home, href: localePath(L, '/') }, { label: c.h1 }]} />
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--secondary)] mb-2">{c.h1}</h1>
      <p className="text-gray-600 mb-6 max-w-2xl">{c.sub}</p>
      <WorkerListClient workers={workers} locale={L} />
      <div className="mt-10 bg-[var(--primary-light)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-[var(--secondary)] mb-2">{c.joinTitle}</h2>
        <p className="text-gray-700 max-w-2xl">{c.joinBody}</p>
      </div>
    </section>
  );
}
