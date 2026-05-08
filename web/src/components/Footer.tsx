import Link from 'next/link';
import { TR_CITIES, slugify, getCategories } from '@/lib/api';

export default async function Footer() {
  const cats = (await getCategories()) || [];
  return (
    <footer className="bg-[var(--secondary)] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="font-bold mb-3 text-base">Yapgitsin</h3>
          <p className="text-white/70 leading-relaxed">
            Türkiye&apos;nin hizmet marketplace platformu. Güvenilir ustalar, hızlı çözümler.
          </p>
        </div>
        <div>
          <h3 className="font-bold mb-3">Popüler Kategoriler</h3>
          <ul className="space-y-2">
            {cats.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/${slugify(c.name)}`} className="text-white/70 hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-3">Şehirler</h3>
          <ul className="space-y-2">
            {TR_CITIES.slice(0, 6).map((city) => (
              <li key={city}>
                <Link href={`/temizlik/${slugify(city)}`} className="text-white/70 hover:text-white">
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-3">İletişim</h3>
          <ul className="space-y-2 text-white/70">
            <li>destek@yapgitsin.com</li>
            <li>0850 000 00 00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Yapgitsin. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
