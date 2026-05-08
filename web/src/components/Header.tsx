import Link from 'next/link';
import { getCategories, slugify } from '@/lib/api';

export default async function Header() {
  const cats = (await getCategories()) || [];
  const top = cats.slice(0, 6);
  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[var(--primary)]">
          <span>Yapgitsin</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {top.map((c) => (
            <Link
              key={c.id}
              href={`/${slugify(c.name)}`}
              className="text-[var(--secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Mobil App
        </Link>
      </div>
    </header>
  );
}
