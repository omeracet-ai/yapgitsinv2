# Yapgitsin — Türkiye'nin AI Destekli Hizmet Platformu

![build](https://img.shields.io/badge/build-passing-brightgreen)
![license](https://img.shields.io/badge/license-Proprietary-blue)
![version](https://img.shields.io/badge/version-1.0.0-blue)
![phases](https://img.shields.io/badge/phases-100-success)

**Yapgitsin**, müşteri ile usta arasında köprü kuran iki taraflı bir hizmet marketplace platformudur. Airtasker / Armut benzeri bir model üzerine inşa edilmiştir — ancak Türkiye pazarına yerelleştirilmiş, AI destekli içerik üretimi, gerçek zamanlı sohbet ve şeffaf puanlama sistemiyle.

100 phase boyunca geliştirilen platform; NestJS backend, Next.js admin paneli, Next.js public/SEO sitesi ve Flutter mobil uygulamadan oluşur. Faz 2'de KKTC, Azerbaycan ve Kosova pazarlarına genişleme planlanmaktadır.

## Mimari

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Flutter App │    │ Admin Panel  │    │  Public Web  │
│ (hizmet_app) │    │(admin-panel) │    │    (web)     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                  ┌────────▼────────┐
                  │  NestJS Backend │
                  │ (nestjs-backend)│
                  │  + WebSocket    │
                  │  + AI (Claude)  │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │ SQLite/Postgres │
                  └─────────────────┘
```

## Hızlı Başlangıç

```bash
# Backend (port 3001)
cd nestjs-backend && npm install && npm run start:dev

# Admin panel (port 3000)
cd admin-panel && npm install && npm run dev

# Public web (port 3002)
cd web && npm install && npm run dev

# Flutter mobile
cd hizmet_app && flutter pub get && flutter run
```

## Stack Detayları

| Stack | Tech | Port | Doc |
|-------|------|------|-----|
| Backend | NestJS + TypeORM + SQLite/Postgres | 3001 | `nestjs-backend/` |
| Admin | Next.js 16 + Tailwind | 3000 | `admin-panel/` |
| Web (SEO) | Next.js 16 + i18n + SSG | 3002 | `web/README.md` |
| Mobile | Flutter 3.x + Riverpod | - | `hizmet_app/` |

## Özellikler (100 Phase Highlight)

- **Audit logging** (Phase 26-36) — admin tüm yazma aksiyonları, filtreleme, CSV export, detay modal
- **AI features** (Phase 74-76, 89) — Claude Opus 4.7 ile ilan açıklaması, yorum özetleme, sohbet
- **Real-time chat** (Phase 66-69, 78-80) — Socket.io, kalıcı mesajlar, online göstergesi
- **Multi-language i18n** (Phase 90-91) — TR/EN/AZ + hreflang
- **PWA + WebP/AVIF** (Phase 95-96) — offline-first, modern image format
- **Public Q&A** — Airtasker tarzı herkese açık soru-cevap
- **Video desteği** — ilan başına 5 video, 50MB limit
- **Token ekonomisi** — teklif başına 5 token, bcrypt + JWT auth
- **Harita entegrasyonu** — yakındaki işler, GPS, koordinat picker
- **Reputation sistemi** — `rating × 20 + success × 5` formülü
- **Public profile pages** — verified rozet, stats, geçmiş işler, yorumlar
- **Rate limiting** — IP başına dakikada 60 istek
- **Swagger/OpenAPI docs** — `/api/docs`
- **Direct booking** — randevu akışı (Job/Offer'dan ayrı)
- **İyzipay sandbox ödeme** — token satın alma
- **Featured/öne çıkan** sistem — ilan, hizmet, usta öne çıkarma
- **Identity verification** — kimlik fotoğrafı + admin onayı (mavi tik)
- **SEO + sitemap.xml + robots.txt** (Phase 85-99)
- **CSV export + filtered pagination** (Phase 29-30)
- **Deep link** (Phase 58) — `yapgitsin://` URL şeması

## Deploy

- **Backend** → `nestjs-backend/DEPLOY.md` (Render / Fly.io / VPS)
- **Web** → `web/DEPLOY.md` (FTP static export)
- **Admin** → Vercel/Netlify (`admin.yapgitsin.tr`)
- **Mobile** → Play Store / App Store (`hizmet_app/`)

Production launch için: [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md)

## Marka

**Yapgitsin** — Türkiye odaklı, multi-country roadmap.

- 🇹🇷 **TR** (yapgitsin.tr) — birincil pazar
- 🇨🇾 **KKTC** (Faz 2)
- 🇦🇿 **Azerbaycan** (Faz 2)
- 🇽🇰 **Kosova** (Faz 2)

## Lisans

Proprietary — © 2026 Yapgitsin. Tüm hakları saklıdır.

## Katkı

Şu anda kapalı kaynak. İç ekip katkıları için `CONTRIBUTING.md` yer-tutucu (TBD).

---

**Built with discipline:** 100 phase, tek developer (Voldi + Müdür), token-disiplini ile.
