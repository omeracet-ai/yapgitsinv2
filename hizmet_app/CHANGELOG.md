# Changelog

## 1.5.1+101 — 2026-05-15

- Google Sign-In altyapısı (Firebase Auth Google provider enabled)
- Apple Sign-In code scaffold (provider enable son adım, Apple Developer hazır olunca)
- iOS Info.plist URL scheme bağlandı (REVERSED_CLIENT_ID)
- Android google-services.json oauth_client refresh

## 1.5.0+100 — 2026-05-15

Phase 158-220 konsolide release. Öne çıkan değişiklikler:

- Harita: Airtasker-style redesign, floating UI, pill pinleri, Yapgitsin logolu turuncu marker'lar
- Harita: katman kontrolü (İlanlar/Ustalar toggle), minZoom/maxZoom limitleri
- Harita: durust koordinat stratejisi — şehir centroid backfill + zorunlu pin + ~yaklaşık rozet
- İlan: post_job zorunlu konum + ~rozet UI
- AI: chat translate, AI asistan endpoint düzeltmeleri
- Admin: harita yönetim sayfası, panel CSP (Cloudflare Analytics), CSS görünürlük
- Auth: token süresi 365 güne çıkarıldı (explicit logout'a kadar oturum)
- Performans: throttler limit ayarları, SkipThrottle public GET endpoint'lerde (429 fix)
- Build: NestJS standalone IIS deploy (web.config, iisnode named pipe patch)
- Güvenlik: .gitignore secret pattern hardening (defense-in-depth)
- TR koordinat backfill scripti (jobs+users NULL lat/lng), SQLite jitter düzeltmesi

## 1.0.0+1

İlk sürüm.
