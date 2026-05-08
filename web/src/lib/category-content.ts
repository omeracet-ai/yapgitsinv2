// Build-time generated SEO content. Populated by `npm run generate-content`.
// When entry is missing (backend offline at build time), helpers return null
// and pages render a generic fallback intro instead.
import contentData from '@/data/category-content.json';
import { slugify } from './api';

export type CategoryContent = {
  description: string;
  headings: string[];
  faqs: { q: string; a: string }[];
};

const MAP = contentData as Record<string, CategoryContent>;

export function getCategoryContent(
  categoryNameOrSlug: string,
  city?: string,
): CategoryContent | null {
  const slug = slugify(categoryNameOrSlug);
  const key = city ? `${slug}/${slugify(city)}` : slug;
  return MAP[key] || null;
}
