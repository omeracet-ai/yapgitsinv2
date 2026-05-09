'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky header shell — turns from transparent to solid white on scroll.
 * Wraps server-rendered Header content.
 */
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={
        'sticky top-0 z-40 transition-all duration-200 ' +
        (scrolled
          ? 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-[var(--border)] shadow-[0_2px_10px_rgba(17,24,39,0.04)]'
          : 'bg-white/0 border-b border-transparent')
      }
    >
      {children}
    </header>
  );
}
