import type { Metadata } from 'next';
import renderCookies, { buildCookiesMetadata } from '../../_locale_pages/cerez-politikasi/page';

export function generateMetadata(): Metadata { return buildCookiesMetadata('en'); }
export default function Page() { return renderCookies('en'); }
