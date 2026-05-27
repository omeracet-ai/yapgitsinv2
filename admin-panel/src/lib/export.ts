/**
 * Browser-side data export helpers.
 *
 * - `exportCsv` / `exportJson` build a Blob, trigger a download, and revoke
 *   the object URL once the click is dispatched. Safe to call from event
 *   handlers in React client components.
 * - `exportPdf` builds a paginated table PDF via jsPDF + jspdf-autotable.
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
 * Coerce any cell value into the short string jspdf-autotable expects.
 * Objects/arrays are JSON-stringified, nullish becomes empty, primitives
 * are toString'ed. Long values are truncated so a single cell can't blow
 * the table layout.
 */
function pdfCell(value: unknown, max = 120): string {
  if (value == null) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
}

/**
 * Export rows as a paginated PDF table. Lazy-loads jspdf + jspdf-autotable
 * so the libs aren't pulled into the initial bundle.
 *
 * Note: jsPDF's bundled fonts (helvetica/courier/times) are WinAnsi (cp1252)
 * which DOES cover Turkish characters (ç, ğ, ı, İ, ö, ş, ü). We stay on
 * helvetica so size stays small; embedding a unicode TTF would add ~200KB.
 */
export async function exportPdf<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  options: { title?: string; columns?: (keyof T)[] } = {},
): Promise<void> {
  if (typeof window === "undefined") return;

  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: unknown }).default as (
    doc: unknown,
    opts: Record<string, unknown>,
  ) => void;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "normal");

  const cols = (
    options.columns ??
    (rows.length ? (Object.keys(rows[0]) as (keyof T)[]) : [])
  ) as string[];

  const head = [cols];
  const body = rows.map((r) =>
    cols.map((c) => pdfCell((r as Record<string, unknown>)[c])),
  );

  // Title (optional)
  let startY = 40;
  if (options.title) {
    doc.setFontSize(14);
    doc.text(options.title, 40, startY);
    startY += 18;
  }

  // Subtitle: generated date + row count
  doc.setFontSize(9);
  doc.setTextColor(120);
  const stamp = new Date().toLocaleString("tr-TR");
  doc.text(`${stamp} • ${rows.length} kayıt`, 40, startY);
  doc.setTextColor(0);
  startY += 10;

  autoTable(doc, {
    head,
    body,
    startY,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [45, 62, 80], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      // Footer: page N / total
      const pageSize = doc.internal.pageSize;
      const pageHeight =
        typeof pageSize.getHeight === "function" ? pageSize.getHeight() : pageSize.height;
      const pageWidth =
        typeof pageSize.getWidth === "function" ? pageSize.getWidth() : pageSize.width;
      // jsPDF page count via internal.pages (index 1-based, [0] is placeholder)
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Sayfa ${pageNum}`,
        pageWidth - 40,
        pageHeight - 20,
        { align: "right" },
      );
      doc.setTextColor(0);
    },
  });

  doc.save(filename);
}
