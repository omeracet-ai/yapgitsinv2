import type { Metadata } from 'next';
import renderBlogList, { buildBlogListMetadata } from '../../_locale_pages/blog/blog-list';

export function generateMetadata(): Promise<Metadata> { return buildBlogListMetadata('az'); }
export default function Page() { return renderBlogList('az'); }
