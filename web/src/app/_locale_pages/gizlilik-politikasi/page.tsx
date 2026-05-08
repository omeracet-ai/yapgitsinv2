import type { Metadata } from 'next';
import type { Locale } from '@/i18n';
import renderLegal, { getLegalDoc } from '../legal';

export function buildPrivacyMetadata(L: Locale): Metadata {
  const d = getLegalDoc(L, 'gizlilik-politikasi');
  return { title: d.title + ' | Yapgitsin', description: d.intro, robots: { index: true, follow: true } };
}

export default function renderPrivacy(L: Locale) {
  return renderLegal(L, 'gizlilik-politikasi');
}
