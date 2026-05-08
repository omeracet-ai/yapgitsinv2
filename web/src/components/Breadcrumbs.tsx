import Link from 'next/link';

export type BreadcrumbItem = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[11px] sm:text-xs md:text-sm text-gray-500 mb-3"
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <span className="text-gray-400">/</span>}
              {isLast || !it.href ? (
                <span className="text-[var(--secondary)] font-semibold truncate max-w-[160px] sm:max-w-[260px]">
                  {it.label}
                </span>
              ) : (
                <Link
                  href={it.href}
                  className="hover:underline hover:text-[var(--primary)] truncate max-w-[140px] sm:max-w-[220px]"
                >
                  {it.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
