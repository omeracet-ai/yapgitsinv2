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
import sanitizeHtml, { IOptions } from 'sanitize-html';

const DEFAULT_OPTIONS: IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  // İçerikte tag varsa text node'unu koru (örn. "<script>alert(1)</script>X"
  // → "X"). sanitize-html default'u boş tag'leri keser.
  disallowedTagsMode: 'discard',
  // Yorum (<!-- -->) ve CDATA'yı da düşür.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

export function SanitizeHtml(options: IOptions = DEFAULT_OPTIONS): PropertyDecorator {
  const merged: IOptions = { ...DEFAULT_OPTIONS, ...options };
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    // Trim sonrasında boş string'i null'a çevirme — `@IsOptional` davranışı
    // bozulmasın diye orijinal değeri (sanitize edilmiş haliyle) döndür.
    return sanitizeHtml(value, merged);
  });
}
