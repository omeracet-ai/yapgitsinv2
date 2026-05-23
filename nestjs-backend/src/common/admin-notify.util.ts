import { EmailService } from '../modules/email/email.service';

/**
 * Phase 264 — Yönetici bildirim e-postası adresi.
 * Tüm şikayet/dilek/istek/anlaşmazlık bildirimleri buraya gider.
 * `ADMIN_NOTIFY_EMAIL` veya `LEAD_NOTIFY_EMAIL` env ile override edilebilir.
 */
export function adminNotifyEmail(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.LEAD_NOTIFY_EMAIL ||
    'bysabri0@gmail.com'
  );
}

const esc = (s: unknown): string =>
  String(s ?? '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Yöneticiye fire-and-forget bildirim e-postası (Resend SMTP).
 * Gönderim başarısız olsa bile çağıran akışı engellemez.
 */
export function sendAdminNotify(
  email: EmailService,
  subject: string,
  fields: Record<string, string | null | undefined>,
): void {
  const to = adminNotifyEmail();
  const rows = Object.entries(fields)
    .map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`)
    .join('');
  const html =
    `<h2>${esc(subject)}</h2>${rows}` +
    `<hr/><p style="color:#6b7280;font-size:12px">${new Date().toLocaleString('tr-TR')}</p>`;
  const text =
    `${subject}\n` +
    Object.entries(fields)
      .map(([k, v]) => `${k}: ${v ?? '—'}`)
      .join('\n');
  void email.send(to, subject, html, text).catch(() => {
    /* fire-and-forget — bildirim akışı bozmaz */
  });
}
