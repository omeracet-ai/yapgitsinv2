// WorkerReviews — server component listing worker reviews with rating header.
import StarRating from './StarRating';

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: { fullName?: string | null; profileImageUrl?: string | null } | null;
  replyText?: string | null;
};

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function WorkerReviews({
  reviews,
  averageRating,
  totalReviews,
  heading = 'Yorumlar',
}: {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
  heading?: string;
}) {
  if (!reviews || reviews.length === 0) return null;
  const count = totalReviews ?? reviews.length;
  const avg = averageRating ?? 0;
  const shown = reviews.slice(0, 5);
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-[var(--secondary)]">
          {count} {heading}
        </h2>
        {avg > 0 && <StarRating rating={avg} size="md" showNumber />}
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {shown.map((r) => (
          <li key={r.id} className="py-4 first:pt-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-medium text-[var(--secondary)] text-sm">
                {r.reviewer?.fullName || 'Müşteri'}
              </span>
              <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
            </div>
            <StarRating rating={r.rating} size="sm" />
            {r.comment && <p className="text-gray-700 text-sm mt-2 leading-relaxed">{r.comment}</p>}
            {r.replyText && (
              <div className="mt-3 ml-4 pl-3 border-l-2 border-[var(--primary-light)] text-sm">
                <span className="font-medium text-[var(--primary)] text-xs">Usta yanıtı</span>
                <p className="text-gray-700 mt-1">{r.replyText}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
