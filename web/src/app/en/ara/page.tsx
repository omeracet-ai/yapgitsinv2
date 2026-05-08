import type { Metadata } from 'next';
import renderSearch, { buildSearchMetadata } from '../../_locale_pages/ara/search';

export function generateMetadata(): Metadata {
  return buildSearchMetadata('en');
}

export default function Page() {
  return renderSearch('en');
}
