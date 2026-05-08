import type { Metadata } from 'next';
import type { Locale } from '@/i18n';
import renderLegal, { getLegalDoc } from '../legal';

export function buildKvkkMetadata(L: Locale): Metadata {
  const d = getLegalDoc(L, 'kvkk');
  return { title: d.title + ' | Yapgitsin', description: d.intro, robots: { index: true, follow: true } };
}

export default function renderKvkk(L: Locale) {
  return renderLegal(L, 'kvkk');
}
