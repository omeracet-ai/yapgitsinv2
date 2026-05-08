import type { Metadata } from 'next';
import renderPrivacy, { buildPrivacyMetadata } from '../../_locale_pages/gizlilik-politikasi/page';

export function generateMetadata(): Metadata { return buildPrivacyMetadata('az'); }
export default function Page() { return renderPrivacy('az'); }
