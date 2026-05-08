import type { Metadata } from 'next';
import renderCategory, { buildCategoryMetadata, getCategoryStaticSlugs } from '../../_locale_pages/[kategori]/category';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getCategoryStaticSlugs();
  return slugs.map((kategori) => ({ kategori }));
}

export async function generateMetadata({ params }: { params: Promise<{ kategori: string }> }): Promise<Metadata> {
  const { kategori } = await params;
  return buildCategoryMetadata('en', kategori);
}

export default async function Page({ params }: { params: Promise<{ kategori: string }> }) {
  const { kategori } = await params;
  return renderCategory('en', kategori);
}
