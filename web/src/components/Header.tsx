import Link from 'next/link';
import { getCategories, slugify, TR_CITIES } from '@/lib/api';
import MobileNav from './MobileNav';
import LocaleSwitcher from './LocaleSwitcher';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';
import { DEFAULT_LOCALE, getDict, localePath, type Locale } from '@/i18n';

const SEARCH_PLACEHOLDER: Record<string, string> = {
  tr: 'Hizmet veya şehir ara...',
  en: 'Search service or city...',
  az: 'Xidmət və ya şəhər axtar...',
};

export default async function Header({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}) {
  const cats = (await getCategories()) || [];
  const top = cats.slice(0, 8);
  const dict = getDict(locale);
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const navCats = top.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    slug: slugify(c.name),
  }));
  const searchCats = (cats.length ? cats : []).map((c) => ({
    name: c.name,
    slug: slugify(c.name),
    icon: c.icon,
  }));
  const placeholder = SEARCH_PLACEHOLDER[locale] || SEARCH_PLACEHOLDER.tr;

  return (
    <header className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-3 flex items-center justify-between gap-3 md:gap-5">
        <Link
          href={localePath(locale, '/')}
          className="flex items-center gap-2 font-bold text-lg md:text-xl text-[var(--primary)] min-h-[44px] flex-shrink-0"
        >
          <span>Yapgitsin</span>
        </Link>
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <SearchBar
            cats={searchCats}
            cities={[...TR_CITIES]}
            localePrefix={localePrefix}
            placeholder={placeholder}
          />
        </div>
        <nav className="hidden lg:flex items-center gap-4 text-sm overflow-x-auto">
          {top.slice(0, 4).map((c) => (
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
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <ThemeToggle labels={dict.theme} />
          <LocaleSwitcher current={locale} />
          <Link
            href={localePath(locale, '/')}
            className="inline-flex items-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]"
          >
            {dict.nav.mobile_app}
          </Link>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle labels={dict.theme} />
          <LocaleSwitcher current={locale} />
          <MobileNav
            cats={navCats}
            searchCats={searchCats}
            cities={[...TR_CITIES]}
            localePrefix={localePrefix}
            searchPlaceholder={placeholder}
          />
        </div>
      </div>
    </header>
  );
}
