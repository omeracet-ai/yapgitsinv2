/**
 * Phase 519 — Inline HTML/script tag strip.
 *
 * DTO'lar için `@SanitizeHtml()` decorator'u kullanılmalı. Bu helper sadece
 * DTO-suz yerlerde (WebSocket payload, @Body('field') tek-key decorator,
 * legacy inline body) doğrudan çağrılır.
 */
import sanitizeHtml from 'sanitize-html';

export function stripHtml(value: unknown): string {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}

export function stripHtmlOptional(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}
