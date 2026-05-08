import type { Metadata } from 'next';
import renderPrivacy, { buildPrivacyMetadata } from '../../_locale_pages/gizlilik-politikasi/page';

export function generateMetadata(): Metadata { return buildPrivacyMetadata('tr'); }
export default function Page() { return renderPrivacy('tr'); }
