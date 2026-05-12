import type { Metadata } from 'next';
import renderWorkers, { buildWorkersMetadata } from '../../_locale_pages/usta/index';

export function generateMetadata(): Metadata { return buildWorkersMetadata('en'); }
export default function Page() { return renderWorkers('en'); }
