import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { jsonLd, alternateLinks, ogLocaleFor } from '@/lib/seo';
import { localBusinessLD } from '@/lib/seo';
import SwRegister from '@/components/SwRegister';
import SentryInit from '@/components/SentryInit';
import PlausibleScript from '@/components/PlausibleScript';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getDict } from '@/i18n';
import './globals.css';

const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme')||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t==='system'&&m);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://yapgitsin.tr';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Yapgitsin — Türkiye\'nin Hizmet Marketplace Platformu',
    template: '%s | Yapgitsin',
  },
  description:
    'Temizlik, tadilat, elektrik, tesisat ve daha fazlası için güvenilir ustalar. Türkiye genelinde binlerce hizmet sağlayıcı tek platformda.',
  alternates: alternateLinks('/'),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    ...ogLocaleFor('tr'),
    siteName: 'Yapgitsin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Yapgitsin' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#007DFE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const d = getDict('tr');
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessLD()) }}
        />
        <PlausibleScript />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--muted)] text-[var(--foreground)]">
        <a href="#main-content" className="skip-link">İçeriğe geç</a>
        <ThemeProvider>
          {children}
          <SwRegister />
          <SentryInit />
          <PwaInstallBanner
            title={d.pwa.title}
            installLabel={d.pwa.install}
            dismissLabel={d.pwa.dismiss}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
