import type { Metadata } from 'next';
import renderCookies, { buildCookiesMetadata } from '../../_locale_pages/cerez-politikasi/page';

export function generateMetadata(): Metadata { return buildCookiesMetadata('tr'); }
export default function Page() { return renderCookies('tr'); }
