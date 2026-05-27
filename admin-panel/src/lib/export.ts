/**
 * Browser-side data export helpers — no external dependencies.
 *
 * - `exportCsv` / `exportJson` build a Blob, trigger a download, and revoke
 *   the object URL once the click is dispatched. Safe to call from event
 *   handlers in React client components.
 * - `exportPdf` is a placeholder. PDF generation requires `jspdf` (or similar);
 *   if you call it today, the user gets a hint about installing the lib.
 *
 * Keep row shapes flat. Nested values are JSON-stringified per cell so the
 * CSV remains valid even when a column holds an object.
 */

/** Escape a single CSV field per RFC 4180. */
function csvEscape(value: unknown): string {
  if (value == null) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Trigger a browser download for an in-memory blob. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari/Firefox have time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export an array of plain row objects as CSV. The header row is the union of
 * keys from the first row; pass `columns` to enforce explicit order.
 */
export function exportCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: (keyof T)[],
): void {
  if (typeof window === "undefined") return;
  if (!rows.length) {
    triggerDownload(new Blob([""], { type: "text/csv;charset=utf-8" }), filename);
    return;
  }
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[])) as string[];
  const header = cols.map(csvEscape).join(",");
  const body = rows
    .map((r) =>
      cols.map((c) => csvEscape((r as Record<string, unknown>)[c])).join(","),
    )
    .join("\n");
  // BOM lets Excel detect UTF-8 (Turkish characters render correctly).
  const blob = new Blob(["﻿" + header + "\n" + body], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

/** Export rows as a pretty-printed JSON file. */
export function exportJson(rows: unknown, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

/**
 * PDF placeholder. Real PDF export requires installing a client-side PDF
 * library (e.g. `jspdf` + `jspdf-autotable`). Until that's wired in we show a
 * hint instead of silently failing. Swap the body for the real implementation
 * when the dependency lands.
 */
export function exportPdf<T extends Record<string, unknown>>(
  _rows: T[],
  _filename: string,
): void {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-alert
  alert(
    "PDF dışa aktarımı için jsPDF kurulumu gerekiyor.\nKurulum sonrası bu fonksiyon güncellenecek.",
  );
}
