import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { jsonLd, alternateLinks, ogLocaleFor } from '@/lib/seo';
import { localBusinessLD } from '@/lib/seo';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Yapgitsin — Türkiye\'nin Hizmet Marketplace Platformu',
    template: '%s | Yapgitsin',
  },
  description:
    'Temizlik, tadilat, elektrik, tesisat ve daha fazlası için güvenilir ustalar. Türkiye genelinde binlerce hizmet sağlayıcı tek platformda.',
  alternates: alternateLinks('/'),
  openGraph: {
    type: 'website',
    ...ogLocaleFor('tr'),
    siteName: 'Yapgitsin',
    images: ['/og-default.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessLD()) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--muted)]">
        {children}
      </body>
    </html>
  );
}
