// WorkerReviews — server component listing worker reviews with rating header.
// Phase 212: photos grid + helpful vote button (client interaction via HelpfulButton).
'use client';
import { useState } from 'react';
import StarRating from './StarRating';

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: { fullName?: string | null; profileImageUrl?: string | null } | null;
  replyText?: string | null;
  photos?: string[] | null;
  helpfulCount?: number;
};

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.yapgitsin.tr';

function HelpfulButton({ reviewId, initial }: { reviewId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (voted || loading) return;
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.helpfulCount ?? count + 1);
        setVoted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={voted || loading}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        voted
          ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-light)]'
          : 'border-[var(--border)] text-gray-500 hover:border-[var(--primary)] hover:text-[var(--primary)]'
      }`}
    >
      <span>{voted ? '👍' : '👍'}</span>
      Faydalı ({count})
    </button>
  );
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
            {/* Phase 212: photo grid */}
            {r.photos && r.photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {r.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Yorum fotoğrafı ${i + 1}`}
                    className="w-20 h-20 rounded-lg object-cover border border-[var(--border)]"
                  />
                ))}
              </div>
            )}
            {r.replyText && (
              <div className="mt-3 ml-4 pl-3 border-l-2 border-[var(--primary-light)] text-sm">
                <span className="font-medium text-[var(--primary)] text-xs">Usta yanıtı</span>
                <p className="text-gray-700 mt-1">{r.replyText}</p>
              </div>
            )}
            {/* Phase 212: helpful vote */}
            <div className="mt-3">
              <HelpfulButton reviewId={r.id} initial={r.helpfulCount ?? 0} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
