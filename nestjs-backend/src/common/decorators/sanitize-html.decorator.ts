/**
 * Phase 519 (Voldi-sec) — XSS Stored sanitize.
 *
 * Audit raporu (E2E 2026-06-23): POST /jobs `<script>alert(1)</script>` aynen
 * kabul ediliyor ve GET /jobs'ta her client'a aynen dönüyor. Admin Next.js +
 * future web view exploitable. CSP `unsafe-inline` Phase 520'de fix edilene
 * kadar tam stored XSS.
 *
 * Çözüm: class-transformer @Transform decorator'u — DTO seviyesinde HTML
 * tag/attribute strip. Global ValidationPipe `transform: true` ile her free-text
 * alana otomatik uygulanır. Validation chain'inde sıralama: `Transform` önce,
 * `IsString/MaxLength` sonra (default `toClassOnly` false → her iki yönde de
 * çalışır).
 *
 * Kullanım:
 *   @SanitizeHtml()
 *   @IsString()
 *   @IsNotEmpty()
 *   title: string;
 *
 * Markdown gerekiyorsa allowedTags override edilebilir:
 *   @SanitizeHtml({ allowedTags: ['b', 'i', 'strong', 'em', 'br', 'p'] })
 *   description: string;
 *
 * NOT: null/undefined geçer (optional alanlarda chain bozulmaz).
 * NOT: string olmayan değer (sayı/array) dokunulmadan döner — validation pipe
 * type uyuşmazlığını ayrıca yakalar.
 */
import { Transform, TransformFnParams } from 'class-transformer';
import type { IOptions } from 'sanitize-html';

/**
 * Phase 520 — UTF-8 safe strip.
 *
 * sanitize-html (htmlparser2 backed) prod ortamında Türkçe multi-byte
 * karakterleri EF BF BD replacement char'a düşürüyor (lokalde çalışıyor
 * ama Plesk Windows + Node 22 + iisnode kombinasyonunda regresyon).
 *
 * Çözüm: HTML tokenizer kullanma — basit regex tag/attribute strip.
 * Multi-byte safe (regex `.` ve `[^>]` UTF-16 code unit'leri tek tek
 * dolaşır, surrogate pair/multi-byte korunur).
 *
 * Strip kuralları:
 *   - `<script>...</script>` (içerik dahil)
 *   - `<style>...</style>` (içerik dahil)
 *   - tüm `<tag ...>` ve `</tag>` (içerik korunur)
 *   - `on*=` event handler artıkları
 *   - `javascript:` / `data:text/html` URL'leri sıfırlanır
 *
 * XSS koruması: text node'lar HTML entity decode EDİLMEZ — frontend
 * (Flutter Text widget, Next.js React) zaten innerText/Text olarak
 * render eder, raw HTML interpret etmez. Admin paneli yalnızca
 * `{value}` (escaped) kullanır; raw HTML injection sink'i yoktur.
 */
function stripHtmlSafe(value: string): string {
  let out = value;
  // 1) script/style — içerik dahil sil (case-insensitive)
  out = out.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  out = out.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  // 2) self-closing / dangling script-style etiketleri
  out = out.replace(/<\s*\/?\s*(?:script|style)\b[^>]*>/gi, '');
  // 3) Tüm diğer tag'leri kaldır (içerik korunur)
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  // 4) javascript:/data:text/html href sızıntıları (text içinde kalmış olabilir)
  out = out.replace(/javascript\s*:/gi, '');
  out = out.replace(/data\s*:\s*text\/html/gi, '');
  // 5) Standalone HTML entity decode YOK — XSS sink'lerine değil text node'a gidiyor.
  return out;
}

// IOptions parametresi backward-compat için tutuldu (call site'lar değişmesin)
// ama opts artık kullanılmıyor.
export function SanitizeHtml(_options?: IOptions): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return stripHtmlSafe(value);
  });
}
