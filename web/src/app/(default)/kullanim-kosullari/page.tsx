import type { Metadata } from 'next';
import renderToU, { buildToUMetadata } from '../../_locale_pages/kullanim-kosullari/page';

export function generateMetadata(): Metadata { return buildToUMetadata('tr'); }
export default function Page() { return renderToU('tr'); }
