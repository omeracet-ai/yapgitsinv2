import type { Metadata } from 'next';
import renderKvkk, { buildKvkkMetadata } from '../../_locale_pages/kvkk/page';

export function generateMetadata(): Metadata { return buildKvkkMetadata('az'); }
export default function Page() { return renderKvkk('az'); }
