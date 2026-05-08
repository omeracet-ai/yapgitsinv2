// Schema.org JSON-LD generators — re-exports from seo.ts for backwards compat
// and a single import surface for structured data.
import { personLD } from './seo';

export {
  jsonLd,
  localBusinessLD,
  serviceLD,
  personLD,
  jobPostingLD,
  breadcrumbLD,
  faqPageLD,
} from './seo';

type ReviewIn = {
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: { fullName?: string | null } | null;
};

// Phase 92 — Person + AggregateRating + Review[] for worker profile pages.
export function personWithReviewsLD(worker: any, reviews: ReviewIn[] = []): object {
  const base: any = personLD(worker);
  const count = worker.totalReviews ?? reviews.length;
  const avg = Number(worker.averageRating || 0);
  if (count > 0 && avg > 0) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(avg.toFixed(2)),
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (reviews.length > 0) {
    base.review = reviews.slice(0, 10).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewer?.fullName || 'Müşteri' },
      datePublished: r.createdAt,
      reviewBody: r.comment || '',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
  }
  return base;
}
