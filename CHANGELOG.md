# Changelog

All notable changes to Yapgitsinv2 are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [SemVer](https://semver.org/).

## [Unreleased]

## [2026-05-15] — Backfill + Maintenance Endpoint Day

### Added
- Admin maintenance endpoint `POST /admin/maintenance/backfill-coords` (Plesk shell bypass)
- District→city mapping (121 ilçe, 28 şehir) — Kadıköy→İstanbul, Çankaya→Ankara vb.
- Google + Apple Sign-In scaffold (provider enable son adım)
- Map workers (users) pin layer
- KVKK legal pages (3 dilde)
- Backfill scripts (--db flag, --apply guard)
- Self-contained promote-admin script

### Fixed
- Admin 500 (deploy-to-d.sh dist/standalone uyumu)
- Flutter web DeferredLoadException (map+profile crash)
- Map pins: FirebaseMapRepository → REST MapRepository
- /jobs vs /service-requests endpoint hizalama
- Image errorBuilder placeholder (orange branded)
- Chat /chat/* → /messages/* path mismatch (login sonrası boş bug)
- Saved jobs anon retry storm guard

### Changed
- App version 1.0.0+1 → 1.5.1+101 (Phase 158-220 konsolide)
- Backend: TypeORM connection pool default
- Web build: deferred-components → monolithic bundle

### Security
- SA key audit (hiç commit edilmemiş, defense-in-depth gitignore)
- Android keystore + .secrets/ pattern oluşturuldu

### Infrastructure
- Firebase Hosting deploy (web + Flutter /app/)
- Plesk admin panel iisnode (deploy-to-d.sh fix)
- Cloudflare DNS, SSL Full strict beklemede

### Hygiene
- `nestjs-backend/dist/` + `admin-panel/dist/` git tracking kaldırıldı (3446 dosya)
- Branded types tek source: `common/branded.types.ts` (duplicate `common/types/branded.ts` silindi)
- Geo utils dedupe: `common/utils/geo.ts` silindi (içerik `geohash.util.ts`'te zaten var)
- Scratch helper'lar `nestjs-backend/_archive/` altına taşındı (6 dosya)
- Ölü kod: `hizmet_app/lib/core/widgets/deferred_screen_loader.dart` silindi
