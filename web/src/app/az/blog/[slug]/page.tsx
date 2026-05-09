import type { Metadata } from 'next';
import renderBlogDetail, {
  buildBlogDetailMetadata,
  getBlogStaticSlugs,
} from '../../../_locale_pages/blog/[slug]/blog-detail';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getBlogStaticSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return buildBlogDetailMetadata('az', slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderBlogDetail('az', slug);
}
