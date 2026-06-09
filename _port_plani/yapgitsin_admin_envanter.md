# Yapgitsin Admin Panel — Envanter

Kaynak: `D:/Yapgitsinv2/admin-panel/src/`
Stack: Next.js 16 (App Router) + React 19 + Tailwind v4 (PostCSS plugin) + Recharts.

---

## 1. Route Haritası

Tüm admin sayfaları `src/app/(admin)/` route group altında. Auth guard `layout.tsx` içinde.

### Login & Kök
| Yol | Dosya | Amaç | API |
|---|---|---|---|
| `/login` | `src/app/login/page.tsx` | Admin girişi (username/password, default `admin`) | `POST /auth/admin/login` |
| `/` | `src/app/page.tsx` | Root redirect | — |
| `/chat` | `src/app/chat/page.tsx` | Admin chat ekranı (kullanıcılarla mesajlaşma) | `/messages/*` |

### (admin) Route Group
Tüm sayfalar `"use client"` + state hooks. Çoğu liste/tablo paterninde.

| Yol | Dosya | Amaç | API endpoints | Görsel |
|---|---|---|---|---|
| `/dashboard` | `(admin)/dashboard/page.tsx` | KPI özet + son ilanlar + 3 chart | `GET /admin/stats`, `GET /admin/analytics/overview`, `GET /admin/jobs?limit`, `GET /stats/public` | KPI kartları + Recharts (Line/Bar) + tablo |
| `/realtime-analytics` | `(admin)/realtime-analytics/page.tsx` | Anlık online kullanıcı + son 7 gün session | `GET /admin/realtime/online`, `GET /admin/realtime/sessions?days=` | Sayaç kartları + kullanıcı listesi |
| `/workforce` | `(admin)/workforce/page.tsx` | Canlı iş gücü / aktif çalışan görünümü | `/admin/realtime/*`, `/admin/users` | Liste + status pill |
| `/jobs` | `(admin)/jobs/page.tsx` | Paginated ilan listesi, status filtresi, featured atama | `GET /admin/jobs?page&search&status`, `PATCH /admin/jobs/:id/featured` | URL-state'li sortable tablo + Pager |
| `/categories` | `(admin)/categories/page.tsx` | Kategori CRUD | `GET/POST/PATCH/DELETE /admin/categories`, `/categories` | Tablo + modal form |
| `/providers` | `(admin)/providers/page.tsx` | Usta listesi, mavi tik, öne çıkar, rozet/skill set | `GET /admin/providers?page&search&status`, `PATCH /admin/providers/:id/verify`, `/featured`, `/users/:id/badges`, `/skills` | Pager'lı tablo |
| `/users` | `(admin)/users/page.tsx` | Kullanıcı listesi + checkbox seçim + bulk verify/feature/suspend + manuel rozet + token grant | `GET /admin/users?page&search&status`, `POST /admin/users/bulk-verify`, `/bulk-feature`, `/bulk-unfeature`, `PATCH /admin/users/:id/suspend`, `/badges/grant`, `/badges/revoke`, `/tokens/grant` | Tablo + toolbar + ConfirmDialog |
| `/revenue` | `(admin)/revenue/page.tsx` | Platform komisyon raporu (toplam + son 30 gün) | `GET /admin/revenue` | KPI kartları |
| `/crypto-deposits` | `(admin)/crypto-deposits/page.tsx` | USDT-TRC20 manuel yatırım onayı | `GET /admin/crypto-deposits?status=`, `PATCH /admin/crypto-deposits/:id/approve`, `/reject` | Liste + onay/red butonlar |
| `/komisyon` | `(admin)/komisyon/page.tsx` | Komisyon oranı + token bedeli (NAV'dan gizli) | `GET/PATCH /admin/settings/commission` | Form |
| `/onboarding-mgmt` | `(admin)/onboarding-mgmt/page.tsx` | Onboarding slide CRUD + reorder + image upload | `GET/POST/PATCH/DELETE /onboarding-slides`, `PATCH /onboarding-slides/reorder`, `POST /uploads/onboarding-image` | Drag liste + form |
| `/promo-codes` | `(admin)/promo-codes/page.tsx` | Promo kod CRUD | `GET/POST/PATCH/DELETE /admin/promo-codes` | Tablo + modal |
| `/moderation` | `(admin)/moderation/page.tsx` | Job/Review/Chat moderasyon kuyruğu (paginated) | `GET /admin/moderation/queue?type&page`, `PATCH /admin/moderation/:type/:id`, `DELETE /admin/moderation/chat/:id`, `/question/:id`, `GET /admin/moderation/flagged` | Tab bar + onay/red |
| `/reports` | `(admin)/reports/page.tsx` | Kullanıcı şikayetleri | `GET /admin/reports?status=`, `PATCH /admin/reports/:id` | Liste + status filter |
| `/disputes` | `(admin)/disputes/page.tsx` | Anlaşmazlık paneli + AI fairness analizi | `GET /admin/disputes/list?status&page`, `PATCH /admin/disputes/general/:id/resolve` | Liste + AI score kartı |
| `/certifications` | `(admin)/certifications/page.tsx` | Usta sertifika onayı | `GET /admin/certifications`, `PATCH /admin/certifications/:id/verify`, `/reject` | Liste + doc link |
| `/audit-log` | `(admin)/audit-log/page.tsx` | Audit log + stats + purge + CSV export | `GET /admin/audit-log?limit&offset&action&targetType&adminUserId`, `/stats?days=`, `/purge-preview`, `POST /purge`, `GET /export` | Tablo + sparkline + purge modal |
| `/blog` | `(admin)/blog/page.tsx` | Blog post listesi (NAV'dan gizli ama route canlı) | `GET /admin/blog?page&limit`, `DELETE /admin/blog/:id` | Tablo |
| `/blog/new` | `(admin)/blog/new/page.tsx` | Yeni post | `POST /admin/blog` | `blog-form.tsx` form |
| `/blog/edit/[id]` | `(admin)/blog/edit/[id]/page.tsx` | Düzenle | `GET/PATCH /admin/blog/:id` | Form |
| `/broadcast` | `(admin)/broadcast/page.tsx` | Segmented bildirim gönderme + geçmiş | `POST /admin/notifications/broadcast`, `GET /admin/notifications/broadcast/history` | Form + history liste |
| `/harita` | `(admin)/harita/page.tsx` | Job + user koordinat yönetimi (harita üstünde) | `PATCH /admin/jobs/:id/location`, `/admin/users/:id/location`, list endpoints | `AdminMap` component |
| `/status` | `(admin)/status/page.tsx` | Sistem sağlık paneli (no-auth health) | `GET /health` | KPI + status pill |
| `/blocked-ips` | `(admin)/blocked-ips/page.tsx` | Bot koruması engellenen IP listesi (Phase 440) | `GET /admin/blocked-ips`, `POST /admin/blocked-ips`, `DELETE /admin/blocked-ips/:id` | Tablo + unblock |
| `/escrow-settings` | `(admin)/escrow-settings/page.tsx` | Phase 267 escrow toggle (QR hide, GPS relax, grace) | `GET/PATCH /admin/escrow/settings` | Toggle form |
| `/profile-card` | `(admin)/profile-card/page.tsx` | Profile card 10 toggle + label override + canlı önizleme | `/admin/app-config/visibility`, layout | Toggle list + PhoneFrame3D preview |
| `/apk-icerik` | `(admin)/apk-icerik/page.tsx` | 📦 APK Yönetim Merkezi (Phase 277 hub — theme/branding/visibility/backup TAB'lı) | `/admin/app-config/*`, `/admin/backup/*` | Tab bar + alt sayfalar |
| `/apk-tasarim` | `(admin)/apk-tasarim/page.tsx` | Tema + branding + animated bg + canlı önizleme | `/admin/app-config/theme`, `/branding` | Color picker + PhoneFrame3D |
| `/apk-builder` | `(admin)/apk-builder/page.tsx` | Drag&drop section builder + AI assistant + Cmd+K + export | `/admin/app-config/layout`, `/screens`, `/history`, `/rollback/:id` | DnD canvas + AI panel |
| `/backup` | (yok? `apk-icerik` içinde tab) | DB snapshot manager | `/admin/backup/list`, `/create`, `/restore`, `/download?filename`, `DELETE ?filename` | Liste + restore modal |
| `/analytics` | `(admin)/analytics/page.tsx` | Genel analytics overview | `GET /analytics/overview`, `/workers`, `/leads`, `/revenue` | Recharts grafikler |
| `/reports` | (yukarıda) | — | — | — |
| `/ayarlar` | `(admin)/ayarlar/page.tsx` | System settings (key/value) | `GET /admin/settings`, `PATCH /admin/settings/:key` | Form liste |

---

## 2. Layout Yapısı

### `src/app/(admin)/layout.tsx`
- **Shell:** Flex layout — sidebar (sol, w-56) + main area (flex-1).
- **Sidebar:**
  - Header: `🛠️ Yapgitsin` logo + "Yönetim Paneli" alt yazı.
  - Nav: 26 NAV item (yorum satırlı 2 gizli: `komisyon`, `blog`). Her item `{ href, label, icon (emoji) }`.
  - Active state: `bg-blue-600 text-white` / hover `bg-slate-800`.
  - Footer: Admin adı + email + `Çıkış Yap` butonu.
  - Renkler: `bg-slate-900` sidebar, `text-slate-300` link, `border-slate-700` ayırıcı.
- **Header:** `AdminTopbar` (`src/components/topbar/AdminTopbar.tsx`) — başlık (NAV'dan match), online sayacı (proxy: verifiedProviders), `NotificationBell`, `LocaleSwitcher`, Cmd+K trigger, AI Assistant trigger.
- **Main:** `bg-gray-50 p-6 overflow-auto`.
- **Animated bg:** `AnimatedGrid` component (z-0).
- **Provider'lar:** `ToastProvider` + `ConfirmDialogProvider` ile sarılı.

### Auth Guard mantığı
- `useEffect` boot'ta:
  1. `localStorage.getItem("admin_token")` oku
  2. `isTokenValid(token)` → JWT payload decode + `exp * 1000 > Date.now()`
  3. Geçersizse `refreshAdminToken()` dene (`POST /auth/refresh` ile refresh token rotate)
  4. Hala geçersizse `localStorage` temizle + `/login` redirect
  5. Geçerliyse `admin_user` parse et + render
- `api.ts` içinde 401 yakalandığında otomatik `refreshAdminToken` tek seferlik retry + başarısızsa `/login` redirect (single-flight lock).

### `src/app/layout.tsx` (root)
- Tüm uygulama için root layout — Geist Sans/Mono font, `SentryInit` mount, html lang.

---

## 3. Tekrarlayan Component'ler

### `src/components/ui/`
| Component | Kullanım | Amaç |
|---|---|---|
| `ConfirmDialog.tsx` | `users`, `jobs`, `categories`, `backup`, çoğu silme/durum değişimi | Promise-based confirm modal (`useConfirm()` hook + `ConfirmDialogProvider`) |
| `Toast.tsx` | Tüm CRUD sayfaları | Success/error toast (`useToast()` hook + `ToastProvider`) |
| `Pager.tsx` | `jobs`, `users`, `providers`, `disputes`, `moderation`, `blog`, `audit-log` | Server-side pagination kontrolleri (page next/prev + size) |

### `src/components/topbar/`
| Component | Kullanım | Amaç |
|---|---|---|
| `AdminTopbar.tsx` | `(admin)/layout.tsx` | Sayfa başlığı + admin label + online proxy + Cmd+K + AI tetik. Dinamik import: `CommandBar`, `AIAssistantPanel` (bundle splitting). |

### `src/components/`
| Component | Kullanım | Amaç |
|---|---|---|
| `NotificationBell.tsx` | `AdminTopbar` | Bildirim sayacı + dropdown |
| `LocaleSwitcher.tsx` | `AdminTopbar` | TR/EN/AZ dil seçici (i18n) |
| `ChatProvider.tsx` | `/chat` + global | Socket.io context |
| `ChatWindow.tsx` | `/chat` | Mesaj balonları + input |
| `ChatMessage.tsx` | `ChatWindow` | Tek mesaj satırı |
| `ConversationList.tsx` | `/chat` | Sohbet listesi sol panel |
| `ReputationProfile.tsx` | `providers`, `users` | Rep skor + rozet rozetleri kart |
| `SentryInit.tsx` | root layout | Error tracking init |

### Komponent klasörleri (alt yapı)
| Klasör | Component(lar) | Kullanım |
|---|---|---|
| `ai-assistant/` | `AIAssistantPanel.tsx` | Topbar'dan açılan AI prompt → config diff paneli (`apk-builder` ile entegre) |
| `animated-bg/` | `AnimatedGrid.tsx` | Layout arka plan animasyonu |
| `apk-preview/` | `ApkPreviewModal.tsx`, `PhoneFrame3D.tsx` | `apk-tasarim`, `apk-icerik`, `profile-card`, `apk-builder` canlı APK önizleme (3D interactive phone, mouse/touch drag ±25°) |
| `command-bar/` | `CommandBar.tsx` | Global Cmd+K palette — sayfa atlama + komut |
| `map/` | `AdminMap.tsx` | `/harita` Leaflet (OSM) harita + job/user pin |
| `AgentSim/` | `AgentSim.tsx`, `Agents.tsx`, `OfficeProps.tsx`, `AgentSim.css`, `data.ts` | Müdür/Voldi agent dispatch animasyonu (görsel demo — sayfa kullanımı belirsiz, muhtemelen geliştirici eğlencesi) |

---

## 4. Tailwind / CSS State

### Tailwind versiyonu
- **Tailwind v4** — `@tailwindcss/postcss` PostCSS plugin (`postcss.config.mjs`).
- `tailwind.config.*` dosyası **YOK** — config inline `globals.css` içindeki `@theme inline` ile.
- `tsconfig.json` import alias: `@/*` → `src/*`.

### `src/app/globals.css` aktif paleti
```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
@media (prefers-color-scheme: dark) {
  :root { --background: #0a0a0a; --foreground: #ededed; }
}
body { font-family: Arial, Helvetica, sans-serif; }
```

### Pratikte kullanılan renk paleti (utility class'larda inline)
- **Sidebar:** `bg-slate-900`, `text-slate-300/400`, `border-slate-700`, active `bg-blue-600`
- **Main bg:** `bg-gray-50` (light)
- **Status pill'leri:** `bg-green-100 text-green-700` (açık), `bg-yellow-100 text-yellow-700` (devam), `bg-blue-100 text-blue-700` (tamamlandı), `bg-red-100 text-red-600` (iptal), `bg-orange-100 text-orange-700` (pending), `bg-rose-100 text-rose-700` (dispute), `bg-purple-100 text-purple-700` (worker), `bg-red-100 text-red-700` (admin)
- **Kartlar:** `bg-white rounded-xl border border-gray-200 shadow-sm`
- **CTA:** `bg-blue-600 hover:bg-blue-700`

Not: CLAUDE.md'de bahsedilen "Airtasker palette — primary `#FF5A1F` coral" admin panelde **uygulanmamış**. Şu an Tailwind slate/blue default'ta.

---

## 5. API Call Paterni

### Token saklama
- `localStorage.admin_token` — access token (JWT, 8h TTL)
- `localStorage.admin_refresh_token` — refresh token (rotate edilir)
- `localStorage.admin_user` — `{ id, fullName, email, role }` JSON

### Fetch wrapper
**Tek dosya:** `src/lib/api.ts` — `BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`.

İç helper'lar:
- `request<T>(path, init?)` — JSON fetch + Bearer header + 401 → refresh + retry tek sefer + başarısız → `/login` redirect
- `requestNoAuth<T>(path)` — public endpoint'ler (`/health`, `/stats/public`, `/app-config`)
- `uploadFile<T>(path, FormData)` — multipart upload (branding, onboarding, kimlik)
- `refreshAdminToken()` — single-flight lock'lu refresh (paralel 401'ler tek `POST /auth/refresh` paylaşır)

### Export edilen API objeleri
- `api` — ana CRUD katalog (~80 method, tüm admin endpoint'leri)
- `analyticsApi` — `/analytics/*` (overview/workers/leads/revenue)
- `adminAnalytics` — `/admin/analytics/overview`

### Tip tanımları (`api.ts` içinde inline)
`Job`, `User`, `Provider`, `Category`, `OnboardingSlide`, `PromoCode`, `BlogPost`, `AuditLog`, `AdminDispute`, `ModerationQueueItem`, `BlockedIp`, `AppConfigTheme`, `AppConfigBranding`, `AppConfigLayout`, `AppConfigVisibilityRule`, `AppScreen`, `Paginated<T>`, vs.

### Yaygın response handling
- Paginated → `{ items, total, page, limit, totalPages }`
- CRUD success → `Toast` success
- CRUD error → `try/catch` + `setError(string)` + `Toast` error
- Confirm → `useConfirm()` promise + ardından mutation
- URL state — `useSearchParams` + `useRouter().push` (özellikle `/jobs`, `/users`, `/providers` — page/search/status URL'de)

### Export utility
`src/lib/export.ts` — `exportCsv`, `exportJson`, `exportPdf` (jsPDF). `/users`, `/jobs` listesinden CSV/JSON/PDF indir.

### WebSocket
`src/lib/useWebSocket.ts` — Socket.io hook (chat + realtime analytics + app-config push).

### Chat context
`src/lib/chatContext.ts` — chat helper'ları.

---

## 6. Tasarım Açıkları

### Polished (göreceli olarak iyi durumda)
- `/dashboard` — Recharts grafikleri + KPI kartları + son ilanlar tablosu, custom `SimpleChart` bar component'i ile yeterli görsel ağırlık.
- `/users` — Bulk seçim toolbar, ConfirmDialog, Toast, manuel rozet UI, token grant — polished.
- `/jobs` — URL-state pagination, status filter, search input — fonksiyonel ama Tailwind default'tan ileri gitmemiş.
- `/audit-log` — Stats card + sparkline + top-5 listeleri + purge modal — Phase 33/36'da özel iş yapılmış.
- `/apk-tasarim`, `/apk-icerik`, `/apk-builder`, `/profile-card` — `PhoneFrame3D` ile interaktif önizleme, AI assistant, Cmd+K — bu blok en gelişkin görsel katman.

### Ham / iskelet (Tailwind default, polish bekleyen)
- `/categories` — Basit tablo + modal, görsel yok.
- `/providers` — Tablo + butonlar, rozet kartı henüz Airtasker-style değil.
- `/promo-codes` — Tablo + form, status badge zayıf.
- `/escrow-settings` — Toggle formu, hiç görsel polish yok.
- `/komisyon` — Basit input form (NAV'dan zaten gizli).
- `/blog` — Blog CMS NAV'dan gizli (`blog: { hidden }`), route hala canlı ama bakım yok.
- `/onboarding-mgmt` — Drag liste ham.
- `/broadcast` — Form + history liste, hiç custom design yok.
- `/reports`, `/disputes` — Liste + status pill, AI fairness kartı dispute'ta var ama görsel zayıf.
- `/certifications` — Onay/red butonlu liste, doc link plain `<a>`.
- `/crypto-deposits` — Pending list + approve/reject form.
- `/blocked-ips` — Tablo + unblock butonu (Phase 440).
- `/status` — Health KPI + status pill (canlı sürüm gösterimi).
- `/realtime-analytics`, `/workforce` — Liste + sayaç.
- `/harita` — `AdminMap` Leaflet kullanıyor, polish OSM default.
- `/analytics` — `analyticsApi` ile Recharts, dashboard'a paralel ama daha az kullanılan ekran.
- `/ayarlar` — Generic key/value setting CRUD.

### Global tasarım açıkları
- Tailwind v4 ama palette inline (sadece bg/fg değişkeni) — branded token'lar (primary/secondary/accent) tanımlı değil.
- Slate/blue default — CLAUDE.md'deki Airtasker `#FF5A1F` coral admin'e uygulanmamış.
- Light theme default + `prefers-color-scheme: dark` var ama dark için kapsamlı utility uyarlaması yok (sadece `--background`/`--foreground`).
- Font: `body` Arial fallback (Geist Sans yüklü ama body için override edilmemiş).
- Header/Topbar yok denecek kadar minimalist — başlık + sayaç + bell.
- Tablolar tamamen Tailwind utility, ayrılmış DataTable component'i yok (tekrar eden kod var).
- Kart pattern'i ad-hoc (`bg-white rounded-xl border border-gray-200 shadow-sm` çoğunlukla copy-paste).
- Empty state komponentleri yok.
- Skeleton/loader: çoğu sayfa `<div className="animate-pulse">Yükleniyor…</div>` basitliğinde.

envanter yazıldı: D:/Yapgitsinv2/_port_plani/yapgitsin_admin_envanter.md
