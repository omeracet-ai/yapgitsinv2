import type { Metadata } from 'next';
import { getDict, localePath, type Locale } from '@/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';

const COPY: Record<Locale, { title: string; desc: string; h1: string; sub: string; formTitle: string; formSub: string; b1: string; b2: string; b3: string }> = {
  tr: {
    title: 'Ücretsiz İlan Ver — Yapgitsin',
    desc: 'İhtiyacınız olan hizmeti birkaç dakikada anlatın, uygun ustalardan teklif alın. Yapgitsin ile ücretsiz ilan verin.',
    h1: 'Ücretsiz İlan Ver',
    sub: 'Ne yaptırmak istediğinizi anlatın; ekibimiz sizi uygun ve onaylı ustalarla buluştursun. İlan vermek ücretsizdir.',
    formTitle: 'İlanınızı bırakın',
    formSub: 'Adınızı, telefonunuzu ve kısaca ihtiyacınızı yazın — en kısa sürede dönüş yapalım.',
    b1: 'Onaylı ustalar',
    b2: 'Birden fazla teklif',
    b3: 'Komisyon yok',
  },
  en: {
    title: 'Post a Job for Free — Yapgitsin',
    desc: 'Describe the service you need in a few minutes and get quotes from verified pros. Post a job for free on Yapgitsin.',
    h1: 'Post a Job for Free',
    sub: 'Tell us what you need done and we will match you with verified local pros. Posting a job is free.',
    formTitle: 'Submit your request',
    formSub: 'Leave your name, phone and a short note about what you need — we will get back to you shortly.',
    b1: 'Verified pros',
    b2: 'Multiple quotes',
    b3: 'No commission',
  },
  az: {
    title: 'Pulsuz Elan Yerləşdir — Yapgitsin',
    desc: 'Ehtiyacınız olan xidməti bir neçə dəqiqəyə təsvir edin və təsdiqlənmiş ustalardan təkliflər alın. Yapgitsin ilə pulsuz elan yerləşdirin.',
    h1: 'Pulsuz Elan Yerləşdir',
    sub: 'Nə etdirmək istədiyinizi yazın; komandamız sizi uyğun və təsdiqlənmiş ustalarla əlaqələndirsin. Elan vermək pulsuzdur.',
    formTitle: 'Sorğunuzu buraxın',
    formSub: 'Adınızı, telefonunuzu və ehtiyacınız haqqında qısa qeyd yazın — ən qısa zamanda sizinlə əlaqə saxlayaq.',
    b1: 'Təsdiqlənmiş ustalar',
    b2: 'Çoxsaylı təkliflər',
    b3: 'Komissiya yoxdur',
  },
};

export function buildPostJobMetadata(L: Locale): Metadata {
  const c = COPY[L] || COPY.tr;
  return { title: c.title, description: c.desc, robots: { index: true, follow: true } };
}

export default function renderPostJob(L: Locale) {
  const dict = getDict(L);
  const c = COPY[L] || COPY.tr;
  return (
    <>
      <section className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 max-w-3xl">
          <Breadcrumbs items={[{ label: dict.breadcrumb.home, href: localePath(L, '/') }, { label: c.h1 }]} />
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">{c.h1}</h1>
          <p className="text-white/90 text-lg max-w-2xl">{c.sub}</p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
            <li className="flex items-center gap-1.5"><span aria-hidden>✓</span> {c.b1}</li>
            <li className="flex items-center gap-1.5"><span aria-hidden>✓</span> {c.b2}</li>
            <li className="flex items-center gap-1.5"><span aria-hidden>✓</span> {c.b3}</li>
          </ul>
        </div>
      </section>
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 max-w-2xl">
        <LeadForm source="landing" title={c.formTitle} subtitle={c.formSub} />
      </section>
    </>
  );
}
