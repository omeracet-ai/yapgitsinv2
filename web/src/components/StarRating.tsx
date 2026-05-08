// StarRating — visual 5-star display (full vs empty), no interactivity.
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
};

export default function StarRating({
  rating,
  size = 'md',
  showNumber = false,
}: {
  rating: number;
  size?: Size;
  showNumber?: boolean;
}) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={`inline-flex items-center gap-1 text-[var(--accent)] ${SIZE[size]}`}
      aria-label={`${rating.toFixed(1)} / 5 yıldız`}
    >
      <span aria-hidden="true">
        {'★'.repeat(r)}
        <span className="text-gray-300">{'★'.repeat(5 - r)}</span>
      </span>
      {showNumber && (
        <span className="text-gray-700 font-medium ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
