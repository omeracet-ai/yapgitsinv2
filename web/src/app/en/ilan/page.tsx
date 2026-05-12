import type { Metadata } from 'next';
import renderPostJob, { buildPostJobMetadata } from '../../_locale_pages/ilan/post';

export function generateMetadata(): Metadata { return buildPostJobMetadata('en'); }
export default function Page() { return renderPostJob('en'); }
