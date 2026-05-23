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

/** Bildirim e-postalarında ID yerine kullanılan kullanıcı bilgisi. */
export interface NotifyUser {
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Kullanıcıyı Ad Soyad / E-posta / Telefon / Adres / Konum olarak çok satırlı metne çevirir. */
export function userInfoText(u: NotifyUser | null | undefined): string {
  if (!u) return '—';
  const addr =
    [u.city, u.district, u.address].filter(Boolean).join(', ') || '—';
  const coord =
    u.latitude != null && u.longitude != null
      ? `${u.latitude}, ${u.longitude}`
      : '—';
  return [
    `Ad Soyad: ${u.fullName ?? '—'}`,
    `E-posta: ${u.email ?? '—'}`,
    `Telefon: ${u.phoneNumber ?? '—'}`,
    `Adres: ${addr}`,
    `Konum (koordinat): ${coord}`,
  ].join('\n');
}

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
    .map(
      ([k, v]) =>
        `<p style="margin:0 0 10px"><b>${esc(k)}:</b><br/>${esc(v).replace(/\n/g, '<br/>')}</p>`,
    )
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
