import type { Metadata } from 'next';
import renderWorker, { buildWorkerMetadata, getWorkerStaticSlugs } from '../../../_locale_pages/usta/[idSlug]/worker';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getWorkerStaticSlugs();
  return slugs.map((idSlug) => ({ idSlug }));
}

export async function generateMetadata({ params }: { params: Promise<{ idSlug: string }> }): Promise<Metadata> {
  const { idSlug } = await params;
  return buildWorkerMetadata('az', idSlug);
}

export default async function Page({ params }: { params: Promise<{ idSlug: string }> }) {
  const { idSlug } = await params;
  return renderWorker('az', idSlug);
}
