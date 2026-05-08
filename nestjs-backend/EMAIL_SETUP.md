# Email Setup (Phase 121)

Yapgitsin transactional email — Nodemailer + SMTP. Without `SMTP_HOST` set, email is silently disabled (no errors).

## 1. SMTP Provider Önerileri

| Provider | Free tier | Notlar |
|----------|-----------|--------|
| **Resend** | 100 mail/gün, 3000/ay | En basit DX, dev için ideal |
| **SendGrid** | 100 mail/gün | Kurumsal, güçlü deliverability |
| **Postmark** | 100 mail/ay (trial) | Transactional odaklı, hızlı |
| **Brevo** (Sendinblue) | 300 mail/gün | TR pazarında popüler |
| **Kendi SMTP** | — | Kendi sunucun (postfix vb.) |

## 2. Env Set

`.env.production.local` (veya `.env`) içine:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_xxx_yyy
EMAIL_FROM="Yapgitsin <noreply@yapgitsin.tr>"
```

`SMTP_SECURE=true` → port 465 (TLS). Çoğu provider için 587 + STARTTLS yeterli.

## 3. Test

```bash
cd nestjs-backend && npm run start:dev
# Yeni kullanıcı kaydı → welcome mail
# POST /auth/forgot-password { "email": "test@example.com" } → reset mail
```

Log'da görmeli: `Email enabled — smtp.resend.com:587 (secure=false)`

`SMTP_HOST` boş ise: `Email disabled — SMTP_HOST not set` (hata yok, sessiz skip).

## 4. Template Özelleştirme

`src/modules/email/email.service.ts`:

- `shell(title, bodyHtml)` — ortak HTML wrapper (header/footer)
- `BRAND` constant → marka rengi (#007DFE)
- `sendWelcome / sendBookingConfirmed / sendOfferAccepted / sendOfferRejected / sendPasswordReset` — template fonksiyonları, inline HTML

Yeni template eklemek için `EmailService` içine helper ekle, `email.service.ts` export et.

## 5. Mail Tetikleyiciler

| Olay | Helper | Yer |
|------|--------|-----|
| Yeni kayıt | `sendWelcome` | `auth.service.ts` `register()` |
| Şifre sıfırlama | `sendPasswordReset` | `auth.service.ts` `forgotPassword()` |
| Rezervasyon onaylandı | generic notif email | `notifications.service.ts` `BOOKING_CONFIRMED` |
| Teklif kabul | generic notif email | `notifications.service.ts` `OFFER_ACCEPTED` |
| Teklif red | generic notif email | `notifications.service.ts` `OFFER_REJECTED` |

Tüm mailler **fire-and-forget** — API yanıtını bloklamaz. Hata = log + skip.

## 6. Production Deliverability

- SPF/DKIM/DMARC kayıtlarını domain'de set et (provider dashboard'undan al)
- `EMAIL_FROM` adresi domain'inle uyumlu olmalı (örn `noreply@yapgitsin.tr`)
- İlk mailler spam'e düşebilir — warm-up gerekir
