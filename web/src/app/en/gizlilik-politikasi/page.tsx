import type { Metadata } from 'next';
import renderPrivacy, { buildPrivacyMetadata } from '../../_locale_pages/gizlilik-politikasi/page';

export function generateMetadata(): Metadata { return buildPrivacyMetadata('en'); }
export default function Page() { return renderPrivacy('en'); }
