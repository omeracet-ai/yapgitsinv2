import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsContent from './search-content';

export const metadata: Metadata = {
  title: 'Arama Sonuçları',
  description: 'Usta ara ve filtrele',
};

export default function SearchPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-[var(--secondary)] mb-2">Arama Sonuçları</h1>
        <p className="text-gray-600 mb-6">Sonuçları filtrele ve sıralaya göre düzenle</p>

        <Suspense fallback={<div className="h-96 bg-white rounded-lg animate-pulse" />}>
          <SearchResultsContent />
        </Suspense>
      </div>
    </div>
  );
}
