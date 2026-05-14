import Link from 'next/link';
import { getCategories, slugify, TR_CITIES } from '@/lib/api';
import HeaderShell from './HeaderShell';
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
    <HeaderShell>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 md:h-18 flex items-center justify-between gap-3 md:gap-5">
        {/* Logo */}
        <Link
          href={localePath(locale, '/')}
          className="flex items-center gap-2 font-extrabold text-xl md:text-2xl flex-shrink-0 tracking-tight"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--primary)] text-white text-sm shadow-md shadow-[var(--primary)]/30">
            Y
          </span>
          <span className="text-[var(--secondary)]">Yapgitsin</span>
        </Link>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-2">
          <SearchBar
            cats={searchCats}
            cities={[...TR_CITIES]}
            localePrefix={localePrefix}
            placeholder={placeholder}
          />
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <a
            href="https://yapgitsin.tr/app?ref=usta-ol"
            target="_blank"
            rel="noopener noreferrer"
            className="relative group text-sm font-semibold text-[var(--secondary)] hover:text-[var(--primary)] px-3 py-2 flex flex-col items-center leading-tight"
          >
            <span>Usta Ol</span>
            <span className="text-[10px] font-normal text-[var(--primary)] leading-none">Ücretsiz kayıt</span>
          </a>
          <Link
            href={localePath(locale, '/musteri')}
            className="text-sm font-semibold text-[var(--secondary)] hover:text-[var(--primary)] px-3 py-2"
          >
            Giriş
          </Link>
          <ThemeToggle labels={dict.theme} />
          <LocaleSwitcher current={locale} />
          <Link
            href={localePath(locale, '/ilan')}
            className="inline-flex items-center bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-full text-sm font-bold min-h-[40px] shadow-md shadow-[var(--primary)]/25 transition-all"
          >
            İlan Ver
          </Link>
        </div>

        {/* Mobile right side */}
        <div className="md:hidden flex items-center gap-1.5">
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
    </HeaderShell>
  );
}
