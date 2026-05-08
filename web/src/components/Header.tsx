import Link from 'next/link';
import { getCategories, slugify } from '@/lib/api';
import MobileNav from './MobileNav';
import LocaleSwitcher from './LocaleSwitcher';
import { DEFAULT_LOCALE, getDict, localePath, type Locale } from '@/i18n';

export default async function Header({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const cats = (await getCategories()) || [];
  const top = cats.slice(0, 8);
  const dict = getDict(locale);
  const navCats = top.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    slug: slugify(c.name),
  }));
  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-3 flex items-center justify-between gap-4 md:gap-6">
        <Link
          href={localePath(locale, '/')}
          className="flex items-center gap-2 font-bold text-lg md:text-xl text-[var(--primary)] min-h-[44px]"
        >
          <span>Yapgitsin</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm overflow-x-auto">
          {top.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              href={localePath(locale, `/${slugify(c.name)}`)}
              className="text-[var(--secondary)] hover:text-[var(--primary)] transition-colors whitespace-nowrap py-2"
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          <Link
            href={localePath(locale, '/')}
            className="inline-flex items-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]"
          >
            {dict.nav.mobile_app}
          </Link>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <LocaleSwitcher current={locale} />
          <MobileNav cats={navCats} />
        </div>
      </div>
    </header>
  );
}
