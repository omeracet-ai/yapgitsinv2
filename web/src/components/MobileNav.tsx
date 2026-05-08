'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Cat = { id: string; name: string; icon?: string; slug: string };

export default function MobileNav({ cats }: { cats: Cat[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-[var(--secondary)] hover:bg-[var(--muted)] active:bg-[var(--primary-light)]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 bg-black/40 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`md:hidden fixed top-0 right-0 h-full w-[82%] max-w-sm bg-white z-50 shadow-2xl transition-transform duration-250 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil menü"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <span className="font-bold text-lg text-[var(--primary)]">Yapgitsin</span>
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-[var(--secondary)] hover:bg-[var(--muted)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="px-2 py-3 overflow-y-auto h-[calc(100%-72px)]">
          <ul className="flex flex-col">
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-[15px] text-[var(--secondary)] hover:bg-[var(--muted)] active:bg-[var(--primary-light)] min-h-[44px]"
                >
                  <span className="text-xl w-7 text-center">{c.icon}</span>
                  <span className="font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 mt-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-3 rounded-lg font-semibold min-h-[44px]"
            >
              Mobil App&apos;i İndir
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
