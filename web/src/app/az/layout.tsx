import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { alternateLinks, ogLocaleFor } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: alternateLinks('/'),
  openGraph: { ...ogLocaleFor('az') },
};

export default function AzLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header locale="az" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
