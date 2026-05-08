import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DEFAULT_LOCALE } from '@/i18n';

// TR (default) route group — header/footer in Turkish, no /tr URL prefix.
export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header locale={DEFAULT_LOCALE} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
