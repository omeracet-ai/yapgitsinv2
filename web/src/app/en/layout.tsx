import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header locale="en" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
