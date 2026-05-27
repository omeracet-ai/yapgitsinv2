# Admin Panel Performance Report — Phase 274 (M7)

Yönetim panelinin admin shell + APK yönetim sayfalarında yapılan
performans optimizasyonları ve sonrası ölçüm sonuçları.

## Optimizations Applied

### 1) `next/dynamic` ile lazy load (4 ağır component)
Initial bundle'dan çıkarıldı — chunk sadece component ilk açıldığında fetch edilir.

| Component | Konum | Tetik |
|---|---|---|
| `AIAssistantPanel` | `AdminTopbar` | 🤖 butonuna basınca |
| `CommandBar` | `AdminTopbar` | Cmd+K / Ctrl+K |
| `ApkPreviewModal` | `apk-tasarim`, `apk-icerik` | 📱 önizleme butonu |
| `PhoneFrame3D` | `apk-builder` | sayfa açılınca (skeleton loading) |

Hepsi `ssr: false` — DOM/storage'a bağımlılar.
`AIAssistantPanel` ve `ApkPreviewModal` ayrıca `open` state guard'ı ile mount
ediliyor, yani kullanıcı açana kadar chunk indirilmez.

### 2) `jspdf` zaten lazy
`@/lib/export#exportPdf` — `await import('jspdf')` + `import('jspdf-autotable')`
ile sadece PDF butonuna basınca yükleniyor. (Mevcut, doğrulandı.)

### 3) Memoization (apk-icerik)
- `SortableLayoutRow` → `React.memo` ile sarıldı. Tab değiştiğinde veya başka
  bir row state değiştiğinde sadece prop'u değişen satır re-render olur.
- `settings`/`layouts`/`rules` zaten `useMemo` ile.

### 4) Image lazy load (apk-tasarim)
Branding preview `<img>` (logo/icon/splash) → `loading="lazy" decoding="async"`.
Viewport'a girene kadar ağ isteği yok.

### 5) AnimatedGrid GPU layer
Gradient wash `<div>` → `will-change: background-position`. Tarayıcı bu
katmanı kendi compositor layer'ına ayırır; 30sn boyunca süren animasyon ana
sayfanın paint pipeline'ını kirletmez.

### 6) Realtime analytics — idle pause
`realtime-analytics/page.tsx` 10s interval'ı `document.hidden` kontrolü ile
sarmalandı. Tab arkaplandayken `api.getEnrichedStats() + getRealtimeOnline() +
getRealtimeSessions()` çağrılmaz; tab geri öne gelince anında bir kez `load()`
çalışır.

## Build Sizes (First Load Uncompressed JS)

`.next/diagnostics/route-bundle-stats.json` çıktısından — Next 16 / Turbopack.

| Route | First Load JS | Notes |
|---|---|---|
| `/dashboard` | **898 KB** | en büyük — recharts + leaflet preload (sayfaya özel) |
| `/onboarding-mgmt` | 556 KB | |
| `/users` | 545 KB | PDF export lazy (jspdf chunk dahil değil) |
| `/audit-log` | 545 KB | |
| `/providers` | 544 KB | |
| `/analytics` | 539 KB | recharts shared chunk |
| baseline (`/login`, `/`) | ~502 KB | shared framework + admin shell |

Not: Yeni route'lar (`/apk-builder`, `/apk-tasarim`, `/apk-icerik`,
`/profile-card`, `/backup`, `/realtime-analytics`, `/escrow-settings`,
`/harita`, `/crypto-deposits`) Next 16 Turbopack'ın bu sürümünde
route-bundle-stats'a düşmüyor. Build clean, static prerender başarılı — chunk
dağılımı `.next/static/chunks/` içinde.

## Future Optimizations

- **Virtualization** — `/users`, `/audit-log`, `/providers` >1000 satıra
  ulaşınca `react-virtual` veya `tanstack/react-virtual` ile sadece görünür
  pencere render edilmeli.
- **PWA / Service Worker** — admin panel offline-first cache (Workbox).
- **Recharts code split** — `/dashboard` (898 KB) içinde chart bileşenleri
  ayrı chunk'a alınabilir; aşağı kaydırınca yüklenecek şekilde.
- **Leaflet defer** — `/harita` sayfası dışında leaflet bundle'a karışmasın
  diye dinamik import zorlanmalı.
- **`<img>` → `next/image`** — APK branding ve avatar görsellerinde
  responsive `srcSet` + format negotiation.
