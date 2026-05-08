// i18n foundation — TR (default, root), EN, AZ
// Static-export friendly: dictionaries imported synchronously at build time.
import tr from './messages/tr.json';
import en from './messages/en.json';
import az from './messages/az.json';

export const LOCALES = ['tr', 'en', 'az'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';

// Locales that live under `[locale]/` segment (TR is at root, no prefix).
export const PREFIXED_LOCALES: Locale[] = ['en', 'az'];

const dictionaries = { tr, en, az } as const;
export type Dict = typeof tr;

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

export function getDict(locale: Locale | string): Dict {
  return isLocale(locale) ? dictionaries[locale] : dictionaries[DEFAULT_LOCALE];
}

// Build a locale-aware path. TR (default) → no prefix. EN/AZ → /en/... or /az/...
export function localePath(locale: Locale | string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE || !isLocale(locale)) return p;
  return `/${locale}${p === '/' ? '' : p}`;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
  az: 'AZ',
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  tr: 'tr',
  en: 'en',
  az: 'az',
};
