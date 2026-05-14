import type { Metadata } from 'next';
import renderBlogList, { buildBlogListMetadata } from '../../_locale_pages/blog/blog-list';

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> { return buildBlogListMetadata('en'); }
export default function Page() { return renderBlogList('en'); }
