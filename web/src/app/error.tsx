'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[web] page error', error);
  }, [error]);

  return (
    <section className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-[var(--accent)] mb-3">!</h1>
      <h2 className="text-2xl font-semibold text-[var(--secondary)] mb-3">
        Bir şeyler ters gitti
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Sayfa yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-6 py-3 rounded-lg font-medium"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="bg-white border border-[var(--border)] text-[var(--secondary)] px-6 py-3 rounded-lg font-medium"
        >
          Anasayfa
        </Link>
      </div>
    </section>
  );
}
