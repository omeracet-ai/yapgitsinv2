# Yapgitsin Production Launch Checklist

> Status: **PRE-LAUNCH** — son kontrol listesi. Her madde tamamlandıkça `[x]` işaretle.

---

## ☐ 1. Backend Deploy

- [ ] PostgreSQL prod DB hazır (Render / Supabase / Fly Postgres)
- [ ] `.env.production` secrets dolu:
  - [ ] `JWT_SECRET` (uzun random)
  - [ ] `ADMIN_INITIAL_PASSWORD`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `IYZIPAY_API_KEY` / `IYZIPAY_SECRET_KEY` / `IYZIPAY_URI` (production)
  - [ ] `DB_TYPE=postgres` + `DB_HOST/PORT/USER/PASS/NAME`
- [ ] `ALLOWED_ORIGINS=https://yapgitsin.tr,https://www.yapgitsin.tr,https://admin.yapgitsin.tr`
- [ ] Docker build + push veya VPS deploy (`nestjs-backend/DEPLOY.md`)
- [ ] `/health` endpoint canlı doğrula
- [ ] Admin user otomatik seed çalıştı (`onModuleInit`)
- [ ] SSL aktif (Cloudflare proxy veya Caddy/Traefik)
- [ ] Uploads klasörü kalıcı disk/volume'a mount

## ☐ 2. Web Deploy (Public SEO)

- [ ] `NEXT_PUBLIC_API_URL=https://api.yapgitsin.tr`
- [ ] `NEXT_PUBLIC_BASE_URL=https://yapgitsin.tr`
- [ ] Build: `cd web && npm run build`
- [ ] AI category content: `npm run generate-content` (backend live olmalı)
- [ ] FTP upload `web/out/` → `public_html/`
- [ ] `.htaccess` yüklendi (rewrite rules)
- [ ] `sitemap.xml` accessible
- [ ] `robots.txt` accessible
- [ ] `favicon.ico` + `og-image.png` render
- [ ] hreflang tag'leri TR/EN/AZ doğru

## ☐ 3. Admin Panel Deploy

- [ ] Vercel/Netlify deploy → `admin.yapgitsin.tr`
- [ ] `NEXT_PUBLIC_API_URL` ayarlı
- [ ] Admin login test (`admin@hizmet.app`)
- [ ] Audit log sayfası çalışıyor
- [ ] CSV export download çalışıyor

## ☐ 4. Mobile App

- [ ] **Android**: `flutter build apk --release` → Play Console internal track
- [ ] **iOS**: `flutter build ios --release` → TestFlight
- [ ] `--dart-define=API_URL=https://api.yapgitsin.tr` production build
- [ ] Deep link (`yapgitsin://`) test
- [ ] Push notification setup (FCM/APNs)
- [ ] App Store screenshots + description (TR)
- [ ] Privacy nutrition labels (iOS)

## ☐ 5. SEO + Analytics

- [ ] Google Search Console — sitemap submit (TR/EN/AZ)
- [ ] hreflang doğrula (Phase 91)
- [ ] OG image preview — Facebook & Twitter validator
- [ ] Schema.org rich result test (Google)
- [ ] PageSpeed Insights ≥ 90 (mobile + desktop)
- [ ] Plausible / Umami analytics ekle
- [ ] Bing Webmaster Tools

## ☐ 6. Marka + Pazarlama

- [ ] Domain: `yapgitsin.tr` (TR), opsiyonel `.com` `.az` `.com.tr`
- [ ] Sosyal medya: Twitter, Instagram, LinkedIn, TikTok
- [ ] İlk 50-100 usta seed (manuel davet, ücretsiz token paketi)
- [ ] Blog/içerik 5-10 SEO makalesi
- [ ] Press kit (logo, screenshot, tagline)
- [ ] Launch day announcement plan

## ☐ 7. Yasal / Regulatory

- [ ] **KVKK** aydınlatma metni
- [ ] **Kullanım koşulları**
- [ ] **Gizlilik politikası**
- [ ] **Mesafeli satış sözleşmesi** (token satışı için)
- [ ] **Çerez politikası** + cookie banner
- [ ] **BTK** durumu kontrolü (Armut sarsıntısından ders al)
- [ ] İyzipay bayi sözleşmesi production
- [ ] Vergi / şirket kurulumu (Şahıs / LTD)

## ☐ 8. Monitoring + Backup

- [ ] `/health` uptime monitor (UptimeRobot / BetterStack)
- [ ] DB daily backup (S3 / R2 / Backblaze)
- [ ] Error tracking (Sentry placeholder)
- [ ] Log aggregation (Axiom / Logtail)
- [ ] Disk usage alarm (uploads dizini)
- [ ] Anthropic API quota monitor
- [ ] Rate limit dashboard

## ☐ 9. Smoke Tests (Launch Day)

- [ ] Kayıt → giriş → profil
- [ ] İlan oluştur (fotoğraf + video upload)
- [ ] Teklif ver (5 token kesim doğrula)
- [ ] Q&A soru-cevap akışı
- [ ] Chat mesaj gönder + history
- [ ] Bildirim alındı
- [ ] Token satın alma (İyzipay)
- [ ] Admin onay flow'u (kimlik doğrulama)
- [ ] Public profile sayfası render
- [ ] Mobile + Web responsive

## ☐ 10. Rollback Plan

- [ ] DB snapshot launch öncesi
- [ ] Git tag: `v1.0.0-launch`
- [ ] Önceki Docker image'i hazır
- [ ] DNS TTL düşür (rollback hızlı olsun)

---

**Tahmini süre:** 3-5 gün (yasal hariç). Yasal süreç paralel yürütülmeli.

**Go/No-Go gate:** 1, 2, 3, 7, 9 → kritik. 4, 5, 6, 8, 10 → soft launch sonrası tamamlanabilir.
