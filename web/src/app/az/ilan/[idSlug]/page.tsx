import type { Metadata } from 'next';
import renderJob, { buildJobMetadata, getJobStaticSlugs } from '../../../_locale_pages/ilan/[idSlug]/job';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getJobStaticSlugs();
  return slugs.map((idSlug) => ({ idSlug }));
}

export async function generateMetadata({ params }: { params: Promise<{ idSlug: string }> }): Promise<Metadata> {
  const { idSlug } = await params;
  return buildJobMetadata('az', idSlug);
}

export default async function Page({ params }: { params: Promise<{ idSlug: string }> }) {
  const { idSlug } = await params;
  return renderJob('az', idSlug);
}
