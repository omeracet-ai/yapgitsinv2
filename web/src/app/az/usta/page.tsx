import type { Metadata } from 'next';
import renderWorkers, { buildWorkersMetadata } from '../../_locale_pages/usta/index';

export function generateMetadata(): Metadata { return buildWorkersMetadata('az'); }
export default function Page() { return renderWorkers('az'); }
