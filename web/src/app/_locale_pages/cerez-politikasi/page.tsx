import type { Metadata } from 'next';
import type { Locale } from '@/i18n';
import renderLegal, { getLegalDoc } from '../legal';

export function buildCookiesMetadata(L: Locale): Metadata {
  const d = getLegalDoc(L, 'cerez-politikasi');
  return { title: d.title + ' | Yapgitsin', description: d.intro, robots: { index: true, follow: true } };
}

export default function renderCookies(L: Locale) {
  return renderLegal(L, 'cerez-politikasi');
}
