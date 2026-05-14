'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';

type Cat = { id: string; name: string; icon?: string; slug: string };
type SearchCat = { name: string; slug: string; icon?: string };

/**
 * MobileNav — combines:
 *  1) Hamburger drawer (categories + search) for the header.
 *  2) Bottom tab bar fixed to viewport (5 tabs, FAB center).
 *
 * Both render md:hidden only.
 */
export default function MobileNav({
  cats,
  searchCats = [],
  cities = [],
  localePrefix = '',
  searchPlaceholder,
}: {
  cats: Cat[];
  searchCats?: SearchCat[];
  cities?: string[];
  localePrefix?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === `${localePrefix}/`;
    return pathname.startsWith(`${localePrefix}${href}`);
  };

  return (
    <>
      {/* Hamburger trigger (in header) */}
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-[var(--secondary)] hover:bg-[var(--muted)] active:bg-[var(--primary-light)]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Drawer backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`md:hidden fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-2xl transition-transform duration-250 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil menü"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <span className="font-extrabold text-lg flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--primary)] text-white text-xs">Y</span>
            <span className="text-[var(--secondary)]">Yapgitsin</span>
          </span>
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[var(--secondary)] hover:bg-[var(--muted)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="px-2 py-3 overflow-y-auto h-[calc(100%-72px)]">
          {searchCats.length > 0 && (
            <div className="px-2 pb-3">
              <SearchBar
                cats={searchCats}
                cities={cities}
                localePrefix={localePrefix}
                placeholder={searchPlaceholder || 'Ara...'}
                variant="mobile"
                onNavigate={() => setOpen(false)}
              />
            </div>
          )}
          <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Kategoriler
          </div>
          <ul className="flex flex-col">
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${localePrefix}/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] text-[var(--secondary)] hover:bg-[var(--muted)] active:bg-[var(--primary-light)] min-h-[44px]"
                >
                  <span className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-lg">{c.icon}</span>
                  <span className="font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 mt-5 space-y-2">
            <Link
              href={`${localePrefix}/ilan`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-3 rounded-full font-bold min-h-[48px] shadow-lg shadow-[var(--primary)]/25"
            >
              ＋ İlan Ver
            </Link>
            <a
              href="https://yapgitsin.tr/app?ref=usta-ol"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 bg-[var(--muted)] text-[var(--secondary)] px-4 py-3 rounded-full font-semibold min-h-[48px] border border-[var(--border)]"
            >
              Usta Olarak Katıl
              <span className="text-[11px] font-normal text-[var(--primary)]">· Ücretsiz</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* Bottom tab bar (mobile only, fixed) */}
      <BottomTabBar localePrefix={localePrefix} isActive={isActive} />
    </>
  );
}

function BottomTabBar({
  localePrefix,
  isActive,
}: {
  localePrefix: string;
  isActive: (href: string) => boolean;
}) {
  const tabs: { href: string; label: string; icon: React.ReactNode }[] = [
    {
      href: '/',
      label: 'Ara',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      href: '/musteri',
      label: 'Kategoriler',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
  ];
  const tabsRight: { href: string; label: string; icon: React.ReactNode }[] = [
    {
      href: '/ara',
      label: 'Mesajlar',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      href: '/usta',
      label: 'Profil',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Alt navigasyon"
    >
      <div className="flex items-center justify-around h-[64px] relative">
        {tabs.map((t) => (
          <TabLink key={t.href} {...t} active={isActive(t.href)} localePrefix={localePrefix} />
        ))}

        {/* Center FAB — İlan Ver */}
        <Link
          href={`${localePrefix}/ilan`}
          aria-label="İlan ver"
          className="-mt-7 w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(255,90,31,0.4)] active:scale-95 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>

        {tabsRight.map((t) => (
          <TabLink key={t.href} {...t} active={isActive(t.href)} localePrefix={localePrefix} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon,
  active,
  localePrefix,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  localePrefix: string;
}) {
  return (
    <Link
      href={`${localePrefix}${href}`}
      className={
        'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ' +
        (active ? 'text-[var(--primary)]' : 'text-gray-400 hover:text-[var(--secondary)]')
      }
    >
      {icon}
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </Link>
  );
}
