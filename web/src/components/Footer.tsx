import Link from 'next/link';
import { slugify, getCategories } from '@/lib/api';

export default async function Footer() {
  const cats = (await getCategories()) || [];
  return (
    <footer className="bg-[var(--secondary)] text-white mt-12">
      {/* App promo strip */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="h-section text-2xl md:text-3xl">
              Mobil uygulamayı indirin
            </h3>
            <p className="text-white/70 mt-2 max-w-md">
              Anlık bildirimlerle teklifleri kaçırmayın, sohbet edin, harita üzerinden takip edin.
            </p>
          </div>
          <div className="flex gap-3">
            <span
              role="img"
              aria-label="App Store — yakında"
              title="Yakında"
              className="inline-flex items-center gap-2 bg-black/90 rounded-2xl px-5 py-3 min-w-[150px] cursor-default select-none"
            >
              <span className="text-2xl" aria-hidden>🍎</span>
              <div className="text-left leading-tight">
                <div className="text-[10px] text-white/60 uppercase">Download on the</div>
                <div className="text-base font-semibold">App Store</div>
              </div>
            </span>
            <span
              role="img"
              aria-label="Google Play — yakında"
              title="Yakında"
              className="inline-flex items-center gap-2 bg-black/90 rounded-2xl px-5 py-3 min-w-[150px] cursor-default select-none"
            >
              <span className="text-2xl" aria-hidden>▶</span>
              <div className="text-left leading-tight">
                <div className="text-[10px] text-white/60 uppercase">Get it on</div>
                <div className="text-base font-semibold">Google Play</div>
              </div>
            </span>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-14 grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-extrabold text-xl mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--primary)] text-white text-sm">
              Y
            </span>
            Yapgitsin
          </div>
          <p className="text-white/70 leading-relaxed mb-5">
            Türkiye&apos;nin hizmet marketplace platformu. Güvenilir ustalar, hızlı çözümler.
          </p>
          <div className="flex gap-2">
            <span aria-label="Instagram — yakında" title="Yakında" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-default select-none">
              <span className="text-base" aria-hidden>📷</span>
            </span>
            <span aria-label="X (Twitter) — yakında" title="Yakında" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-default select-none">
              <span className="text-base" aria-hidden>𝕏</span>
            </span>
            <span aria-label="Facebook — yakında" title="Yakında" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-default select-none">
              <span className="text-base" aria-hidden>f</span>
            </span>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-base">Popüler hizmetler</h3>
          <ul className="space-y-2.5">
            {cats.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/ilan?kategori=${slugify(c.name)}`} className="text-white/70 hover:text-white transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold mb-4 text-base">Kurumsal & Yasal</h3>
          <ul className="space-y-2.5 text-white/70">
            <li className="flex items-center gap-2"><span aria-hidden>✉️</span> destek@yapgitsin.com</li>
            <li className="flex items-center gap-2"><span aria-hidden>☎</span> 0850 000 00 00</li>
          </ul>
          <ul className="space-y-2.5 mt-4 pt-4 border-t border-white/10">
            <li><Link href="/kvkk" className="text-white/70 hover:text-white transition-colors">KVKK</Link></li>
            <li><Link href="/kullanim-kosullari" className="text-white/70 hover:text-white transition-colors">Kullanım Koşulları</Link></li>
            <li><Link href="/gizlilik-politikasi" className="text-white/70 hover:text-white transition-colors">Gizlilik Politikası</Link></li>
            <li><Link href="/cerez-politikasi" className="text-white/70 hover:text-white transition-colors">Çerez Politikası</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Yapgitsin. Tüm hakları saklıdır.</div>
          <div>Made with ❤️ in Türkiye</div>
        </div>
      </div>
    </footer>
  );
}
