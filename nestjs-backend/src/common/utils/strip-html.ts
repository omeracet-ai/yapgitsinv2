/**
 * Phase 519 — Inline HTML/script tag strip.
 *
 * DTO'lar için `@SanitizeHtml()` decorator'u kullanılmalı. Bu helper sadece
 * DTO-suz yerlerde (WebSocket payload, @Body('field') tek-key decorator,
 * legacy inline body) doğrudan çağrılır.
 */
/**
 * Phase 520 — UTF-8 safe HTML strip (regex, multi-byte güvenli).
 * sanitize-html v2.17 + htmlparser2 prod regresyonu nedeniyle değiştirildi.
 * Detay: common/decorators/sanitize-html.decorator.ts.
 */
function stripHtmlSafe(value: string): string {
  let out = value;
  out = out.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  out = out.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  out = out.replace(/<\s*\/?\s*(?:script|style)\b[^>]*>/gi, '');
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  out = out.replace(/javascript\s*:/gi, '');
  out = out.replace(/data\s*:\s*text\/html/gi, '');
  return out;
}

export function stripHtml(value: unknown): string {
  if (typeof value !== 'string') return '';
  return stripHtmlSafe(value);
}

export function stripHtmlOptional(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  return stripHtmlSafe(value);
}
