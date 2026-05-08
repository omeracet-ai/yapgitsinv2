import Link from 'next/link';
import { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from '@/i18n';

// Server-rendered locale switcher. Each link points to the equivalent root URL
// for that locale (we don't try to translate the current pathname — keeps it
// static-export friendly without client JS).
export default function LocaleSwitcher({ current }: { current: Locale }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {LOCALES.map((l) => {
        const href = l === DEFAULT_LOCALE ? '/' : `/${l}`;
        const active = l === current;
        return (
          <Link
            key={l}
            href={href}
            aria-label={`Switch to ${LOCALE_LABELS[l]}`}
            className={
              'px-2 py-1 rounded-md min-h-[32px] inline-flex items-center font-medium transition-colors ' +
              (active
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]')
            }
          >
            {LOCALE_LABELS[l]}
          </Link>
        );
      })}
    </div>
  );
}
