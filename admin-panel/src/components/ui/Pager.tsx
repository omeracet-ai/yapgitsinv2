"use client";

/**
 * P191/4 — Reusable pagination control.
 * Used in admin users/providers/jobs tables.
 *
 * Renders «‹ 1 2 … N ›» with a "...". Clicking any page invokes onChange.
 */
import { useMemo } from "react";

export interface PagerProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/** Build a compact list of page tokens (numbers + "…"). */
function buildTokens(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) return range(1, totalPages);
  const tokens: Array<number | "…"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);
  if (left > 2) tokens.push("…");
  for (const n of range(left, right)) tokens.push(n);
  if (right < totalPages - 1) tokens.push("…");
  tokens.push(totalPages);
  return tokens;
}

export function Pager({ page, totalPages, onChange, className = "" }: PagerProps) {
  const tokens = useMemo(() => buildTokens(page, totalPages), [page, totalPages]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (totalPages <= 1) return null;

  return (
    <nav
      className={`flex items-center justify-center gap-1 py-3 ${className}`}
      aria-label="Sayfalandırma"
    >
      <button
        type="button"
        onClick={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
        className="rounded-md border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Önceki sayfa"
      >
        ‹
      </button>
      {tokens.map((t, i) =>
        t === "…" ? (
          <span key={`e${i}`} className="px-2 text-sm text-gray-400 select-none">
            …
          </span>
        ) : (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            disabled={t === page}
            aria-current={t === page ? "page" : undefined}
            className={`min-w-[2.25rem] rounded-md border px-2.5 py-1 text-sm transition-colors ${
              t === page
                ? "border-blue-600 bg-blue-600 text-white font-semibold cursor-default"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => canNext && onChange(page + 1)}
        disabled={!canNext}
        className="rounded-md border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Sonraki sayfa"
      >
        ›
      </button>
    </nav>
  );
}

export default Pager;
