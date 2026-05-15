# Changelog

## 1.5.4+104 — 2026-05-15

### Added
- Android 13+ POST_NOTIFICATIONS permission (FCM bildirim göstermek için zorunlu)
- WAKE_LOCK permission (FCM background için)
- com.google.android.c2dm.permission.RECEIVE explicit

## 1.5.3+103 — 2026-05-15

### Changed
- Premium Dark Soft theme (vibrant green #4ADE80 + dark BG #0C1117)
- Playfair Display serif headings
- Inter sans body
- Pill button radius 28
- Card radius 16
- All hardcoded #FF5E14 spillover → AppColors.primary

### Added
- OnlineCountBadge widget
- Brand identity: lowercase "yapgitsin." + green Y logo
- Map fitBounds: tüm pinleri kapsayacak otomatik zoom

### Fixed
- Map fetch trigger silent fail (permission)
- Null-island (0,0) → İstanbul fallback
- Chat /chat/* → /messages/* route hizalama
- Saved jobs anon retry storm

## 1.5.2+102 — 2026-05-15

### Fixed
- Chat module 404: /chat/* endpoints fixed → /messages/* (mesajlar sekmesi)
- Saved jobs anon retry storm: anon kullanıcıda backend çağrı yok

### Added
- Map: worker pin layer (mavi #0EA5E9, person_pin)
- Map: jobs+workers paralel fetch (Future.wait)

### Changed
- Map default radius 500 km (Türkiye geneli)

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
