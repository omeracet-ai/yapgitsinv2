import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AzLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header locale="az" />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
