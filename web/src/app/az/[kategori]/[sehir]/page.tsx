import type { Metadata } from 'next';
import renderCategoryCity, { buildCategoryCityMetadata, getCategoryCityStaticParams } from '../../../_locale_pages/[kategori]/[sehir]/category-city';

export const dynamicParams = false;

export async function generateStaticParams() {
  return getCategoryCityStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ kategori: string; sehir: string }> }): Promise<Metadata> {
  const { kategori, sehir } = await params;
  return buildCategoryCityMetadata('az', kategori, sehir);
}

export default async function Page({ params }: { params: Promise<{ kategori: string; sehir: string }> }) {
  const { kategori, sehir } = await params;
  return renderCategoryCity('az', kategori, sehir);
}
