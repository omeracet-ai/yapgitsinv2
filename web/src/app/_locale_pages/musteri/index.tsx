import type { Metadata } from 'next';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';

const COPY: Record<Locale, { title: string; desc: string; h1: string; sub: string; appNote: string; postCta: string }> = {
  tr: {
    title: 'Giriş — Yapgitsin',
    desc: 'Yapgitsin hesabınıza mobil uygulamadan giriş yapın. İlanlarınızı yönetin, tekliflerle sohbet edin, ustaları takip edin.',
    h1: 'Hesabınıza Giriş',
    sub: 'Yapgitsin hesabınız mobil uygulamada yaşıyor. Giriş yapmak, ilanlarınızı yönetmek ve ustalarla sohbet etmek için uygulamayı kullanın.',
    appNote: 'Yapgitsin mobil uygulamasını App Store veya Google Play üzerinden indirin (yakında).',
    postCta: 'Hemen ücretsiz ilan ver',
  },
  en: {
    title: 'Sign In — Yapgitsin',
    desc: 'Sign in to your Yapgitsin account from the mobile app. Manage your jobs, chat with quotes, follow pros.',
    h1: 'Sign in to your account',
    sub: 'Your Yapgitsin account lives in the mobile app. Use the app to sign in, manage your jobs and chat with pros.',
    appNote: 'Download the Yapgitsin mobile app from the App Store or Google Play (coming soon).',
    postCta: 'Post a job for free now',
  },
  az: {
    title: 'Giriş — Yapgitsin',
    desc: 'Yapgitsin hesabınıza mobil tətbiqdən daxil olun. Elanlarınızı idarə edin, təkliflərlə söhbət edin, ustaları izləyin.',
    h1: 'Hesabınıza giriş',
    sub: 'Yapgitsin hesabınız mobil tətbiqdə yaşayır. Daxil olmaq, elanlarınızı idarə etmək və ustalarla söhbət etmək üçün tətbiqdən istifadə edin.',
    appNote: 'Yapgitsin mobil tətbiqini App Store və ya Google Play vasitəsilə yükləyin (tezliklə).',
    postCta: 'İndi pulsuz elan yerləşdir',
  },
};

export function buildCustomerHomeMetadata(L: Locale): Metadata {
  const c = COPY[L] || COPY.tr;
  return { title: c.title, description: c.desc, robots: { index: false, follow: true } };
}

export default function renderCustomerHome(L: Locale) {
  const dict = getDict(L);
  const c = COPY[L] || COPY.tr;
  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 max-w-2xl">
      <Breadcrumbs items={[{ label: dict.breadcrumb.home, href: localePath(L, '/') }, { label: c.h1 }]} />
      <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--secondary)] mb-3">{c.h1}</h1>
      <p className="text-gray-700 mb-4 leading-relaxed">{c.sub}</p>
      <p className="text-gray-600 text-sm mb-8">{c.appNote}</p>
      <a
        href={localePath(L, '/ilan')}
        className="inline-flex items-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-5 py-3 rounded-full font-bold transition-colors"
      >
        {c.postCta} →
      </a>
    </section>
  );
}
