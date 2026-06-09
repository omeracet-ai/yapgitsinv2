# Yapgitsin Admin — Yaprakzade Görsel Port Yürütme Planı

Hedef: Yaprakzade admin'in **Premium Dark Soft** görsel sistemini (kaynak: `D:/masaüstü/Yaprakzade/admin/assets/admin-design.css`) Yapgitsin Next.js 16 admin paneline (hedef: `D:/Yapgitsinv2/admin-panel/src/`) port etmek.

**Kapsam:** Sadece görsel katman (tokens, layout shell, component lib, sayfa class migration, ikon, premium dokunuş). API yüzeyi, route haritası ve iş mantığı sabit.

**Kalan iş:** Faz B-F. Faz A globals.css'te (Phase 481 local, commitsiz) tamamlandı.

---

## Genel Kararlar (her faz için bağlayıcı)

### Tailwind v4 vs custom CSS bölüşümü
- **`globals.css` `@layer base`**: CSS değişkenleri (`--ad-*` tokens), body radial gradient atmosfer, scrollbar, selection, `:focus-visible` glow, `prefers-reduced-motion` override, h1 gradient-text.
- **`globals.css` `@layer components`**: yalnız çapraz-component primitive'leri — `.ad-card`, `.ad-stat`, `.ad-table` (mobile data-label fallback dahil), `.ad-modal-backdrop`, `.ad-spinner`, `.ad-skeleton`. Bunlar Tailwind'den ifade etmesi zor (mask-image, multi-layer shadow, `::after` strip, `@container` table→card).
- **Tailwind utility**: butonlar, badge'ler, layout flex/grid, padding/margin, basit hover'lar `tailwind.config` extend + utility class.
- **`@theme inline`** içine ek renkler: `--color-ad-green`, `--color-ad-green-light`, `--color-ad-gold`, `--color-ad-card`, `--color-ad-elev`, `--color-ad-line`, `--color-ad-ink`, `--color-ad-muted`. Bu Tailwind'de `bg-ad-card`, `text-ad-ink` kullanımını açar.
- **Renk değişkenleri**: tek doğru kaynak `:root`. Tailwind tokens bu değişkenleri sarmalar — palet değişirse tek yer (`globals.css`) güncellenir.

### Dark theme kararı
Yaprakzade tek tema (dark soft). Yapgitsin'in eski `prefers-color-scheme: dark` blok'u **kaldırılır**. Tek-tema yaklaşımı:
- Admin paneli yönetim aracı, müşteri uygulaması değil — light/dark seçim ihtiyacı yok.
- Light path desteği iki kat maintenance demek; Yaprakzade'nin premium hissi dark-only'de oturuyor.
- Status pill renkleri (`bg-green-100 text-green-700` vs.) artık dark-uyumlu (`bg-success/14 text-success`) varyantlara migrate edilir.
- `<html>` üzerine `class="dark"` koyulmaz; `:root` zaten dark. `data-theme` switch'i de yok.

### API yüzeyi
**Değişmez.** `src/lib/api.ts`, route haritası, endpoint çağrıları, query param'ları, response shape'i, auth guard, token refresh — sıfır değişiklik. Sadece JSX class'ları ve component import'ları değişir.

### Regression smoke seti (her sayfada minimum)
1. `/login` → admin giriş (username `admin`, env şifre)
2. `/dashboard` → KPI'lar + 3 chart render
3. CRUD örneği: `/users` → arama + sayfa değiştirme + bulk verify
4. Modal: `/categories` → açma/kapama + form submit
5. Toast: bir CRUD başarısı yeşil toast gösteriyor mu
6. Dark theme: hiçbir sayfada beyaz arka plan flash'ı yok

### Toplam tahmini
- **Commit sayısı**: 14 commit (Faz B: 2, Faz C: 4, Faz D: 4, Faz E: 2, Faz F: 2)
- **Toplam süre**: ~16-20 saat (B: 2h, C: 4h, D: 8h, E: 1.5h, F: 2h, buffer 2-3h)

---

## Faz A — Design tokens (TAMAMLANDI)

Phase 481'de `globals.css` Yaprakzade `:root` token bloğu birebir kopyalandı. `@theme inline` Tailwind v4 token bridge'i kuruldu. Body atmosphere, focus-glow, scrollbar, selection, h1 gradient-text yerinde. **Bu faz atlanır**, sadece B-F için temel referans.

---

## Faz B — Layout shell port

### Hedef
Admin shell'ini Yaprakzade sidebar+content topolojisine çevirmek. Sidebar gradient `linear-gradient(180deg,#131b25,#0f161f)` + 220px fixed + 3px altın left-border aktif state. Mobile drawer 80vw off-canvas.

### Önkoşullar
Faz A (tokens canlı).

### Dokunulacak dosyalar
- `src/app/(admin)/layout.tsx` — **rewrite** (sidebar markup + nav grouplama state + mobile drawer)
- `src/components/topbar/AdminTopbar.tsx` — **patch** (renkleri token'a çek, mobile-only `MobileTopbar`'a indirge)
- `src/app/globals.css` — **patch** (`@layer components`: `.ad-sidebar`, `.ad-nav-link`, `.ad-nav-link.active`, `.ad-nav-group-title`, mobile drawer transform)
- `src/components/nav/AdNavGroup.tsx` — **yeni** (Radix Accordion wrapper, sessionStorage persist)
- `src/components/nav/AdNavLink.tsx` — **yeni** (NextLink + active state + icon slot)
- `package.json` — **patch** (`@radix-ui/react-accordion` ekle, varsa skip)

### Yapılacak işler — sıralı checklist
1. `pnpm add @radix-ui/react-accordion @radix-ui/react-dialog` (Accordion + Dialog mobile drawer için).
2. `globals.css` `@layer components` içine ekle: `.ad-sidebar` (gradient bg + 220px + fixed + scroll), `.ad-nav-link` (10px 12px padding, 8px radius, left-border-3px-transparent), `.ad-nav-link:hover` (`translateX(2px)` + green tint), `.ad-nav-link.active` (horizontal gradient + gold left-border + inset highlight), `.ad-nav-group-title` (10px uppercase 1.6px letter-spacing).
3. `AdNavGroup.tsx` üret: Radix Accordion.Item; trigger `<summary>`-benzeri (group title + chevron `›` 90° rotate aria-state). Tek-anda-1-açık: `Accordion.Root type="single" collapsible`. `sessionStorage` key `yp_admin_nav_open_v2` ile persist.
4. `AdNavLink.tsx`: `NextLink` + `usePathname()` ile active detect; icon slot `ReactNode` (Faz E'de lucide gelecek, şimdilik emoji passthrough).
5. `(admin)/layout.tsx` rewrite:
   - Mevcut sidebar markup'ını `.ad-sidebar` + `AdNavGroup` + `AdNavLink` ile değiştir.
   - NAV array yapısını gruplanmış formata çevir: `{ group: "Ana", items: [...] }`. 26 sayfa için 4-5 grup (Ana, İçerik, Moderasyon, APK Yönetim, Sistem).
   - Brand bloğu: h1 gradient-text (`globals.css`'teki `.ad-brand` veya inline h1).
   - Sidebar-foot: kullanıcı adı + Çıkış (mevcut markup'ı token renklere uyarla).
   - Desktop content area: `style={{ marginLeft: 220 }}` veya `lg:ml-[220px]` + padding `24px 32px`.
   - Max-width 4K cap: `max-w-[1600px] mx-auto` content wrapper.
   - Mobile drawer: Radix `Dialog.Root` + `Dialog.Content` slide animation (`data-state` ile `translateX`). `lg:hidden` toggle.
6. `AdminTopbar.tsx`: arka plan `bg-ad-card`, border `border-ad-line-soft`. Desktop'ta sadece sağ taraf (sayaç + bell + locale + Cmd+K + AI) — başlık zaten sayfa h1'inde. Mobile'da `mobile-topbar` paterni (60px sticky, hamburger 44×44 sol, brand ortaya, logout sağ).
7. `AnimatedGrid` z-index'ini `-1`'e it; sidebar/content `z-0` üstte.
8. `prefers-reduced-motion`: drawer transition kapatılır (`globals.css` zaten ekledi, doğrula).

### Doğrulama / smoke
- `pnpm build` clean (Next 16 + Tailwind v4 + Radix peer warning yok).
- `/dashboard`, `/users`, `/jobs` aç — sidebar 220px, gradient bg, aktif link altın left border + green gradient.
- Mobile (DevTools 375px): hamburger sol-üstte, drawer slide; backdrop blur var.
- Console error yok. Active link iki sayfa geçişinde doğru kalıyor.
- Regression riski: Active link path match yanlış olursa hiçbir item highlight olmaz. `/jobs/new` gibi nested route'larda parent `/jobs` highlight mantığını startsWith ile kontrol et.

### Commit mesajı template
`feat(phase-482): admin sidebar shell — Yaprakzade gradient + accordion nav + mobile drawer`
`feat(phase-483): admin topbar — token colors + mobile-only paths`

### Tahmini süre
2 saat (sidebar markup + accordion state + drawer + smoke).

---

## Faz C — Component library (`src/components/ad/`)

### Hedef
Yaprakzade premium primitive'lerini React component'lerine sarmalamak. Tüm sayfaların ortak primitive'i — Faz D bu library'yi kullanır.

### Önkoşullar
Faz B (shell hazır, tokens canlı).

### Dokunulacak dosyalar
Hepsi **yeni dosya** `src/components/ad/` altında:
- `AdButton.tsx`
- `AdCard.tsx`
- `AdStat.tsx`
- `AdInput.tsx` + `AdLabel.tsx` + `AdTextarea.tsx` + `AdSelect.tsx`
- `AdTable.tsx` (alt component'ler: `AdTable.Head`, `AdTable.Row`, `AdTable.Cell`)
- `AdModal.tsx` (Radix Dialog wrapper)
- `AdBadge.tsx`
- `AdSpinner.tsx` + `AdSkeleton.tsx`
- `AdEmpty.tsx` (empty state — Yapgitsin'de yoktu, ekliyoruz)
- `index.ts` — barrel export

`globals.css` **patch**: `@layer components` içine `.ad-table` (mobile data-label CSS), `.ad-modal-backdrop` (blur(6px)), `.ad-stat::before` (sol 3px brand strip), `.ad-spinner` keyframes (zaten Faz A'da olabilir, kontrol).

### Yapılacak işler — sıralı checklist (her component için variant + props)

1. **AdButton** — `variant: 'primary' | 'secondary' | 'danger'`, `size: 'sm' | 'md'`, `loading?: boolean`, `asChild?` (Radix Slot opsiyonel). Token: `bg-ad-green`, hover `translateY(-1px)`, focus glow 3px green-glow ring. Loading state spinner ikon slot.
2. **AdCard** — `padding: 'md' | 'lg'`, `as?: 'div' | 'section'`. Background `bg-ad-card`, border `border-ad-line-soft`, radius 12px, shadow-sm. Slot: `header`, `footer` opsiyonel.
3. **AdStat** — `label`, `value`, `delta?` (yeşil/kırmızı arrow), `icon?`. 3D shadow (3-katmanlı) + sol 3px gradient strip (`::before` pseudo, globals.css). Hover lift `translateY(-3px)`.
4. **AdInput / AdTextarea / AdSelect** — `label?`, `help?`, `error?`, `leftIcon?`. `bg-ad-elev`, border `border-ad-line` 1.5px, focus → `border-ad-green-light` + green-glow shadow. Error state border `--ad-err`.
5. **AdLabel** — `htmlFor`, `required?` (kırmızı asterisk). Token text-ad-ink-dim, 500 weight.
6. **AdTable** — Sub-components: `AdTable.Root`, `AdTable.Thead`, `AdTable.Tbody`, `AdTable.Tr`, `AdTable.Th`, `AdTable.Td`. Sticky thead, 2px brand-green border-bottom, row hover bg `--ad-card-hover`. Mobile'da `display: block` + her `<td>` `data-label` attr. **TS prop**: `<AdTable.Td data-label="Müşteri">...</AdTable.Td>` — kullanıcı manuel verir (JS enjeksiyonu yerine — React'te statik daha güvenli).
7. **AdModal** — Radix Dialog wrapper. Slots: `title`, `description?`, `body`, `footer`. Backdrop `bg-black/60 backdrop-blur-md`. Body padding 20px, footer right-aligned actions. Mobile bottom-sheet varyantı (`variant="sheet"`) — `sheet-handle` 44×4 üstte.
8. **AdBadge** — `tone: 'success' | 'warn' | 'err' | 'info' | 'muted'`. 11px uppercase pill, 600 weight, 0.04em letter-spacing. Action badges (audit-log) için `act` prefix opsiyonel.
9. **AdSpinner** — 18px default, `size: 14 | 18 | 24`. Border 2px `--ad-line`, top `--ad-green-light`, 0.8s rotate.
10. **AdSkeleton** — `w`, `h`, `radius?`. Shimmer gradient `1e2a36→222d3a→1e2a36`, 1.4s animation. `<AdSkeleton.Text lines={3} />` text varyantı.
11. **AdEmpty** — `icon?`, `title`, `description?`, `action?`. Centered, muted colors. Genel "Veri yok" durumu.
12. **`index.ts` barrel**: `export { AdButton, AdCard, ... } from './...'`.
13. Her component için JSDoc tek paragraf + variant tablosu kod yorumu.
14. **Storybook YOK** — Yapgitsin'de zaten yok, eklemiyoruz. Inline doğrulama D fazında sayfa içinde.

### Doğrulama / smoke
- `pnpm build` clean — tree-shaking için her component dosyası tek `export`.
- TypeScript strict: `<AdButton variant="primary">` autocomplete çalışıyor; yanlış variant compile error.
- Geçici test sayfası `/admin/__lab` opsiyonel (bu commit'le birlikte gelmesin, yerel test sonrası sil).
- Regression riski: Mevcut sayfalar `Toast`/`ConfirmDialog` kullanıyor — yeni `AdModal`'la çakışmasın. AdModal **yeni** primitive; mevcut `ConfirmDialog`/`Toast` kalır (Faz D'de düşünülür).

### Commit mesajı template
`feat(phase-484): admin ad/* component lib — AdButton/AdCard/AdStat/AdBadge`
`feat(phase-485): admin ad/* form primitives — AdInput/AdLabel/AdTextarea/AdSelect`
`feat(phase-486): admin ad/* AdTable + mobile data-label CSS`
`feat(phase-487): admin ad/* AdModal/AdSpinner/AdSkeleton/AdEmpty`

### Tahmini süre
4 saat (4 commit × ~1 saat).

---

## Faz D — Sayfa migrasyonu (26 sayfa)

### Hedef
26 admin sayfasının class'larını Tailwind slate/blue/gray'den `ad-*` token + `Ad*` component'lere çevirmek. Polished sayfalardan başla (etkili demo), ham sayfaları batch-3'te topla.

### Önkoşullar
Faz B + Faz C tamamen bitmiş. Component library import'a hazır.

### Sayfa grupları (envanter Bölüm 6'dan)

**Polished sayfalar (etki büyük, batch-1 + batch-2)**
1. `/dashboard` — KPI kartları → `AdStat`, son ilanlar → `AdTable`, Recharts colors token'a (`--ad-green`, `--ad-gold`).
2. `/users` — Bulk toolbar → `AdButton` varyantları, tablo → `AdTable`, ConfirmDialog/Toast mevcut kalır.
3. `/jobs` — URL-state tablo + filter → `AdTable` + `AdInput` (search) + `AdSelect` (status).
4. `/audit-log` — Stats card → `AdCard` + `AdStat`, top-5 listeleri → `AdCard`, purge modal → `AdModal` migration.
5. `/apk-tasarim` — Color picker form + `PhoneFrame3D` (3D komp dokunma, sadece çevre class'lar).
6. `/apk-icerik` — Tab bar token renkleri, hub layout `AdCard` grid.
7. `/apk-builder` — DnD canvas (logic intakt), AI panel `AdCard` + savebar `glassmorphism` (Faz F).
8. `/profile-card` — Toggle list `AdButton` + `AdCard`, PhoneFrame3D korunur.

**Ham sayfalar (batch-3 + batch-4)**
9. `/categories` — Tablo + modal → `AdTable` + `AdModal`.
10. `/providers` — Tablo + verify/featured butonlar → `AdTable` + `AdButton`.
11. `/promo-codes` — `AdTable` + `AdModal` form.
12. `/escrow-settings` — Toggle form → `AdCard` + toggle pattern.
13. `/komisyon` — Form → `AdInput` + `AdLabel`.
14. `/onboarding-mgmt` — Drag liste + form (DnD logic intakt).
15. `/broadcast` — Form + history → `AdCard` + `AdTable`.
16. `/reports` — Liste + status filter → `AdTable` + `AdBadge`.
17. `/disputes` — Liste + AI fairness kart → `AdTable` + `AdCard` (special).
18. `/certifications` — Onay/red liste → `AdTable` + `AdButton`.
19. `/crypto-deposits` — Pending list → `AdTable` + approve/reject form.
20. `/blocked-ips` — Tablo + unblock → `AdTable`.
21. `/status` — Health KPI → `AdStat`.
22. `/realtime-analytics` — Sayaç + liste → `AdStat` + `AdTable`.
23. `/workforce` — Liste + status → `AdTable` + `AdBadge`.
24. `/harita` — `AdminMap` çevresinde panel `AdCard`.
25. `/analytics` — Recharts colors token'a.
26. `/ayarlar` — Key/value form → `AdInput` table-like.
27. `/blog`, `/blog/new`, `/blog/edit/[id]` — Form `AdInput`/`AdTextarea`/`AdButton` (NAV gizli ama route canlı; minimum efor).

### Dokunulacak dosyalar
Her sayfa için ilgili `src/app/(admin)/<path>/page.tsx` — **patch** (class değişimi + import güncellemesi).

### Yapılacak işler — sıralı checklist (her batch için)

**Batch-1 — Polished hero sayfalar (commit 1)**
1. `/dashboard`: KPI kartları → `<AdStat label="..." value="..." />` × N. Recharts `<Bar fill="var(--ad-green)" />`. Son ilanlar tablosu → `AdTable`. Bg slate-50 → body radial atmosfer kalıyor, kart bg `bg-ad-card`.
2. `/users`: Toolbar → `<AdButton variant="primary">Doğrula</AdButton>` vs. Checkbox accent token. Tablo → `AdTable` + `AdBadge` (status pill).
3. `/jobs`: Search → `<AdInput leftIcon={<Search />} />` (lucide Faz E'de gelecek — şimdilik passthrough). Status filter → `AdSelect`. Tablo → `AdTable`. Pager mevcut kalır, renk patch.
4. Smoke: bu 3 sayfayı tarayıcıda gez — login → dashboard → 1 CRUD.

**Batch-2 — APK + audit (commit 2)**
1. `/audit-log`: Stats card → `AdCard` + `AdStat`. Sparkline SVG renkleri token. Purge modal → `AdModal` migration.
2. `/apk-tasarim`: Form alanları `AdInput`/`AdLabel`. PhoneFrame3D çevre `AdCard`.
3. `/apk-icerik`: Tab bar — `border-ad-line` + active tab `border-b-2 border-ad-green`. Hub kartları `AdCard`.
4. `/apk-builder`: DnD canvas çevresi `AdCard`, AI panel `AdCard`, savebar Faz F'de.
5. `/profile-card`: Toggle row → custom `AdToggle` (eksik component varsa AdButton tabanlı switch).
6. Smoke: `/audit-log` purge modal aç-kapa, `/apk-tasarim` color picker.

**Batch-3 — Ham sayfa toplu migration (commit 3)**
1. `/categories`, `/providers`, `/promo-codes`, `/escrow-settings`, `/komisyon`, `/onboarding-mgmt`, `/broadcast` — her biri ~10-20dk class swap.
2. Pattern: `bg-white rounded-xl border border-gray-200 shadow-sm` → `AdCard` veya `bg-ad-card rounded-xl border border-ad-line-soft`. `bg-blue-600 hover:bg-blue-700` → `<AdButton variant="primary">`. Status pill `bg-green-100 text-green-700` → `<AdBadge tone="success">`.
3. Smoke: her sayfa açılıyor mu, ana CRUD çalışıyor mu (silme + onay modal).

**Batch-4 — Kalan ham sayfalar (commit 4)**
1. `/reports`, `/disputes`, `/certifications`, `/crypto-deposits`, `/blocked-ips`, `/status`, `/realtime-analytics`, `/workforce`, `/harita`, `/analytics`, `/ayarlar`, `/blog*`.
2. Aynı class swap pattern'i.
3. Recharts kullanan sayfalarda (`/analytics`, `/dashboard`) grafik renkleri `var(--ad-green)`, `var(--ad-gold)`, `var(--ad-info)` token'larına çek.
4. Smoke: her sayfa açılıyor, bir CRUD çalışıyor.

### Doğrulama / smoke (her batch sonu)
- `pnpm build` clean.
- Manual: login → dashboard → 1 polished sayfa + 1 ham sayfa.
- Dark theme: hiçbir sayfada beyaz arka plan flash yok.
- Mobile (DevTools 375px): tablolar data-label kart formuna dönüşüyor (AdTable.Td `data-label` attr verilmişse).
- Regression riski: Recharts default colors light-friendly; dark bg'de okunabilir mi kontrol. ConfirmDialog/Toast eski API kalır — değiştirme yok (Faz D scope dışı).

### Commit mesajı template
`feat(phase-488): admin batch-1 — dashboard/users/jobs Yaprakzade pattern`
`feat(phase-489): admin batch-2 — audit/apk-* + profile-card pattern`
`feat(phase-490): admin batch-3 — ham sayfalar set-1 (categories/providers/promo/escrow/komisyon/onboarding/broadcast)`
`feat(phase-491): admin batch-4 — ham sayfalar set-2 (reports/disputes/cert/crypto/blocked-ips/status/realtime/workforce/harita/analytics/ayarlar/blog)`

### Tahmini süre
8 saat (Batch-1: 1.5h, Batch-2: 1.5h, Batch-3: 2h, Batch-4: 3h — Recharts color tuning dahil).

---

## Faz E — İkon migrasyonu

### Hedef
Emoji ikonları (sidebar nav, modal close, breadcrumb) `lucide-react` SVG'lere çevirmek. Görsel tutarlılık + accessibility (screen reader, scaling, color inherit).

### Önkoşullar
Faz B (sidebar markup hazır) + Faz C (AdButton icon slot hazır).

### Dokunulacak dosyalar
- `package.json` — **patch** (`pnpm add lucide-react`)
- `src/app/(admin)/layout.tsx` — **patch** (NAV array her item'a `icon: LucideIcon` ekle)
- `src/components/nav/AdNavLink.tsx` — **patch** (icon prop tip `LucideIcon`, 16×16 render)
- `src/components/topbar/AdminTopbar.tsx` — **patch** (Cmd+K trigger `Command` ikonu, AI trigger `Sparkles`)
- `src/components/NotificationBell.tsx` — **patch** (`Bell` ikonu)
- `src/components/apk-preview/ApkPreviewModal.tsx` — **patch** (`X` close butonu)
- Sayfa içi emoji kalıntıları — **patch** (Faz D batch'lerden kalan)

### Emoji → lucide mapping tablosu
| Emoji | Lucide |
|---|---|
| 📊 Dashboard | `BarChart3` |
| 🛒 Siparişler | `ShoppingCart` |
| 💵 Finance/Revenue | `Banknote` |
| 📦 Ürünler/APK | `Package` |
| 🏷️ Kategoriler | `Tag` |
| 🖼️ Slider/Branding | `Image` |
| 📝 Blog | `FileText` |
| ⭐ Yorumlar | `Star` |
| 🤝 Referanslar | `Handshake` |
| 🧪 Formül/Lab | `FlaskConical` |
| 🛠️ Yapgitsin brand | `Wrench` |
| 👥 Users | `Users` |
| 📍 Harita | `MapPin` |
| 📡 Realtime | `Radio` |
| 🎯 Workforce | `Target` |
| 🚫 Blocked IPs | `ShieldOff` |
| 📜 Audit log | `ScrollText` |
| ⚙️ Ayarlar | `Settings` |
| 💬 Chat | `MessageSquare` |
| 🔔 Bell | `Bell` |
| ⌘ Command | `Command` |
| ✨ AI | `Sparkles` |
| × Close | `X` |
| ⎋ Logout | `LogOut` |
| ☰ Hamburger | `Menu` |

### Yapılacak işler — sıralı checklist
1. `pnpm add lucide-react`.
2. `(admin)/layout.tsx` NAV array refactor: her item `icon: BarChart3` (string emoji yerine component import).
3. `AdNavLink.tsx`: prop `icon: LucideIcon` — `<Icon size={16} className="text-current" />`. Color current `text-ad-muted`, active `text-ad-gold`.
4. `AdminTopbar.tsx`: Cmd+K trigger içinde `<Command size={14} />`, AI trigger `<Sparkles size={14} />`.
5. `NotificationBell.tsx`: `<Bell size={18} />` mevcut emoji yerine.
6. `ApkPreviewModal.tsx`: close butonu `<X size={16} />`.
7. Grep `\u{1F300}-\u{1FAFF}` ile sayfa içi emoji kalıntılarını tara, listele, replace et.
8. Bundle size kontrol: lucide tree-shake çalışıyor — sadece import edilen iconlar gelir. `pnpm build` sonrası `.next/static` size farkı +15kb beklenir.

### Doğrulama / smoke
- `pnpm build` clean, bundle size delta <30kb.
- Sidebar her item ikonlu, hizalama 16×16, active'de altın renk.
- DevTools accessibility: tüm ikonların ya `aria-hidden="true"` ya da `aria-label` mevcut.
- Regression riski: lucide TreeShake için `import { BarChart3 } from 'lucide-react'` named import — `import * as Icons` yapma. Bundle ikiye katlanır.

### Commit mesajı template
`feat(phase-492): admin lucide-react migration — sidebar + topbar`
`feat(phase-493): admin lucide ikinci tur — modal/bell/page residue`

### Tahmini süre
1.5 saat (kurulum 15dk, NAV refactor 30dk, geri kalan komponentler 45dk).

---

## Faz F — Premium dokunuşlar

### Hedef
Yaprakzade'nin "premium hissi"ni veren mikro-detaylar: glassmorphism savebar, stat 3D hover lift kontrolü, h1 gradient-text yaygınlaştırması, focus glow doğrulama, prefers-reduced-motion respect.

### Önkoşullar
Faz B-E tamamen bitti.

### Dokunulacak dosyalar
- `src/app/globals.css` — **patch** (`.ad-savebar` glassmorphism, `.ad-h1` opsiyonel utility)
- `src/app/(admin)/apk-builder/page.tsx` — **patch** (savebar bottom-sticky `.ad-savebar`)
- `src/app/(admin)/ayarlar/page.tsx` — **patch** (form bottom savebar)
- `src/app/(admin)/apk-tasarim/page.tsx` — **patch** (savebar)
- `src/app/(admin)/profile-card/page.tsx` — **patch** (savebar)
- Tüm sayfa `<h1>` — **patch** (gradient text class — eğer globals.css'te `h1` selector yoksa)
- `src/components/ad/AdStat.tsx` — **patch** (hover lift `prefers-reduced-motion` koşullu)

### Yapılacak işler — sıralı checklist
1. `globals.css` `@layer components` içine `.ad-savebar`: `position: sticky; bottom: 0; background: rgba(22,32,43,.72); backdrop-filter: blur(12px); border-top: 1px solid var(--ad-line-soft); padding: 12px 20px; display: flex; gap: 8px; justify-content: flex-end; z-index: 50;`.
2. Savebar'ı 4 sayfada uygula: apk-builder, apk-tasarim, ayarlar, profile-card. Pattern: form içinde sticky-bottom, `<AdButton variant="primary">Kaydet</AdButton>` + `<AdButton variant="secondary">İptal</AdButton>`.
3. h1 gradient-text: `globals.css`'te `h1` global selector zaten gradient veriyorsa skip. Yoksa `.ad-h1` utility ekle ve tüm sayfa h1'lerine sınıf ver.
4. AdStat hover lift: mevcut `transition: transform .25s` + `:hover { transform: translateY(-3px); box-shadow: 0 24px 40px -20px black; }`. `@media (prefers-reduced-motion: reduce) { transform: none !important; }`.
5. Focus glow doğrula: tüm interactive (input, button, link) `:focus-visible` 3px green-glow ring var mı (DevTools'ta Tab gez).
6. Reduce motion test: DevTools "Emulate prefers-reduced-motion: reduce" — drawer slide kapanmıyor (instant), stat hover lift yok, animasyonlar 0.01s.
7. `::selection` brand-green (globals.css'te zaten var, doğrula).
8. Scrollbar token'lar (sidebar 6px brand-green thumb, body 10px), zaten Faz A'da olabilir.
9. Müşteri notu highlight, total satırı gradient — Yapgitsin'de yok, atla (Yaprakzade'ye özel ticari widget).
10. WhatsApp button (orders detail) — Yapgitsin'de yok, atla.

### Doğrulama / smoke
- `pnpm build` clean.
- `/apk-builder` form scroll'da savebar bottom'da sticky + blur arka plan.
- DevTools reduce motion: hover lift yok, drawer instant.
- DevTools Tab navigation: her odaklanan element 3px green-glow ring gösteriyor.
- `/dashboard` h1 altın-beyaz gradient görünüyor.
- Lighthouse a11y skoru >95 (focus visible + aria + color contrast).
- Regression riski: `backdrop-filter` Safari <14'te yok — fallback bg opaklığı %85 yeterli. CSS @supports kullanma ihtiyacı yok (admin paneli; modern tarayıcı zorunlu).

### Commit mesajı template
`feat(phase-494): admin glassmorphism savebar — apk-builder/ayarlar/apk-tasarim/profile-card`
`feat(phase-495): admin premium polish — h1 gradient + reduce-motion respect + focus glow audit`

### Tahmini süre
2 saat (savebar 4 sayfa × 15dk + h1 audit + reduce motion test + focus audit).

---

## Toplam Özet

| Faz | Kapsam | Commit | Süre |
|---|---|---|---|
| A | Tokens (tamam) | 1 (yapıldı) | 0 |
| B | Layout shell + sidebar | 2 | 2h |
| C | Component library | 4 | 4h |
| D | Sayfa migration (26 sayfa, 4 batch) | 4 | 8h |
| E | Lucide ikon migration | 2 | 1.5h |
| F | Premium dokunuşlar | 2 | 2h |
| **Toplam (kalan)** | | **14** | **~17.5h** (+ buffer 2-3h) |

### Risk haritası
- **En yüksek risk**: Faz D Batch-1 — polished sayfaların regression'ı. Dashboard Recharts renkleri okunmazsa kullanıcıyı yavaşlatır. Mitigation: ilk batch'i deploy sonrası 30dk gözlemle.
- **Orta risk**: Faz B sidebar accordion sessionStorage çakışması (Yaprakzade ve Yapgitsin aynı domain'de değil — sorun yok). Active link path match.
- **Düşük risk**: Faz E bundle size, Faz F backdrop-filter Safari fallback.

### Smoke ritüeli (her commit sonrası)
1. `pnpm build` clean
2. `pnpm start` → `/login` → admin giriş
3. `/dashboard` render
4. Etkilenen sayfayı aç + 1 CRUD aksiyonu
5. Mobile 375px DevTools — drawer + tablo data-label
6. Console error yok

### Tek tema kararı tekrarı
Light theme kaldırılır. `prefers-color-scheme: dark` blok'u `globals.css`'ten temizlenir. Gerekçe: admin tek kullanıcı türü (yönetim), Yaprakzade'nin premium dark hissi marka kimliğinin parçası, iki tema iki maintenance.

### API yüzeyi tekrarı
`src/lib/api.ts`, `useWebSocket.ts`, `chatContext.ts`, route haritası, JWT refresh — hiçbiri değişmez. Sadece JSX class'ları ve component import'ları değişir.
