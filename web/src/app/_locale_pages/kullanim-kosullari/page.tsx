import type { Metadata } from 'next';
import type { Locale } from '@/i18n';
import renderLegal, { getLegalDoc } from '../legal';

export function buildToUMetadata(L: Locale): Metadata {
  const d = getLegalDoc(L, 'kullanim-kosullari');
  return { title: d.title + ' | Yapgitsin', description: d.intro, robots: { index: true, follow: true } };
}

export default function renderToU(L: Locale) {
  return renderLegal(L, 'kullanim-kosullari');
}
