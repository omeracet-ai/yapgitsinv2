# Yaprakzade Admin — Visual & UX Design System (Port Kaynağı)

Hedef: Bu doküman `D:/masaüstü/Yaprakzade/admin/` admin panelinin görsel katmanını birebir Yapgitsin Next.js admin'ine port etmek içindir. Mimari/iş mantığı dışarıdadır.

Ana CSS kaynağı: `assets/admin.css` (functional base) + `assets/admin-design.css` (premium overlay — cascade son, `!important` ağırlıklı override). İkisi sırayla yüklenir; admin-design.css "tek doğru kaynak" (`:root` token bloğu).

---

## 1. Renk paleti

CSS değişkenlerinden birebir (admin-design.css `:root`):

### Marka
| Token | Hex | Kullanım |
|---|---|---|
| `--ad-green` | `#2d5e3e` | Primary brand (koyu yeşil — yaprak) |
| `--ad-green-dark` | `#1f3a2a` | Vurgu/gradient bottom |
| `--ad-green-light` | `#3a7a51` | Hover/focus accent, link |
| `--ad-green-glow` | `rgba(45,94,62,.16)` | Focus ring (3px) |
| `--ad-gold` | `#c9a96e` | Secondary accent (altın — premium dokunuş, h1 gradient end, .active border) |
| `--ad-gold-glow` | `rgba(201,169,110,.18)` | Soft glow |

### Surface — "Premium Dark Soft"
| Token | Hex | Kullanım |
|---|---|---|
| `--ad-bg` | `#0c1117` | Body background |
| `--ad-card` | `#16202b` | Card / panel / table |
| `--ad-card-hover` | `#1a2a36` | Row hover |
| `--ad-elev` | `#1e2a36` | Input / elevated chip |
| `--ad-pop` | `#222d3a` | Tooltip / popover |

### Text
| Token | Hex | Kullanım |
|---|---|---|
| `--ad-ink` | `#e6e8eb` | Primary text |
| `--ad-ink-dim` | `#cbd1d8` | Secondary text / table td |
| `--ad-muted` | `#9aa4b2` | Label / placeholder / count |
| `--ad-faint` | `#6b7689` | Hint / disabled |

### Border
| Token | Hex |
|---|---|
| `--ad-line` | `#2a3340` |
| `--ad-line-soft` | `#222b36` |
| `--ad-line-strong` | `#3a4555` |

### State
| Token | Hex |
|---|---|
| `--ad-success` | `#22c55e` (rgba .14 bg, `#86efac` text) |
| `--ad-warn` | `#f59e0b` (`#fbbf24` text) |
| `--ad-err` | `#ef4444` (`#fca5a5` text) |
| `--ad-info` | `#3b82f6` (`#93c5fd` text) |

### Body atmosferi
`body::before` ile fixed radial gradient katman:
- Sağ-üst: `radial-gradient(1200px 600px at 90% -10%, rgba(45,94,62,.08), transparent 60%)`
- Sol-alt: `radial-gradient(900px 500px at -10% 110%, rgba(201,169,110,.05), transparent 60%)`

---

## 2. Tipografi

- **Font**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif` (self-host veya Google Fonts — admin-design.css içinde `@import` yok; sistem fallback baskın)
- **Mono**: `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` (kod/ce-key chip)
- Base font-size: `13px` (`--ad-fs-md`), line-height: `1.55`
- Antialias: `-webkit-font-smoothing: antialiased`

### Boyut hiyerarşisi
| Token | Px | Kullanım |
|---|---|---|
| `--ad-fs-xs` | 11 | Badge / count / uppercase label |
| `--ad-fs-sm` | 12 | Help text, table head |
| `--ad-fs-md` | 13 | Body, input, btn |
| `--ad-fs-lg` | 15 | h3, group-title |
| `--ad-fs-xl` | 17 | h2, brand |
| `--ad-fs-2xl` | 20 | — |
| `--ad-fs-3xl` | 24 | h1, stat number |
| `--ad-fs-4xl` | 32 | (rezerv) |

### Weight & special
- h1: `700`, `letter-spacing: -0.02em`, **gradient text** `linear-gradient(135deg, var(--ad-ink) 0%, var(--ad-gold) 200%)` → background-clip:text (premium altın-beyaz geçiş)
- h2: `600`, `letter-spacing: -0.01em`
- h3: `600`, `--ad-ink-dim`
- Uppercase mini-label'lar: `letter-spacing: 0.08em–0.12em` (table th, stat .lbl, group-title)

---

## 3. Layout shell

Yapı: `flex` body — sidebar fixed + content flex.

### Sidebar
- **Genişlik**: 220px desktop, 200px (≤1024), 188px (≤900); mobilde off-canvas drawer 80vw / max 320px
- **Background**: `linear-gradient(180deg, #131b25 0%, #0f161f 100%)`, sağ border `1px solid --ad-line-soft`, `box-shadow: --ad-shadow-md`
- **Pozisyon**: ≥761px `position: fixed; top:0; left:0; height:100vh; overflow:hidden` — nav kendi içinde scroll (`overflow-y:auto`, `scrollbar-width:thin`, brand-green thumb)
- **İçerik**: brand bloğu (üst) → `<nav>` (gruplanmış `<details>` accordion) → sidebar-foot (alt, kullanıcı adı + Çıkış)
- **Sidebar-group**: native `<details>`/`<summary>` — accordion (aynı anda 1 grup açık, sessionStorage `yp_admin_nav_open_v2`). Group title: 10px font, weight 800, letter-spacing 1.6px, uppercase, üst border
- **Nav link**: padding `10px 12px`, border-radius 8px, font 13px, `border-left: 3px solid transparent`
  - hover: `background: rgba(45,94,62,.10)`, `transform: translateX(2px)`
  - active: `background: linear-gradient(90deg, rgba(45,94,62,.22), rgba(45,94,62,.06))`, `border-left-color: --ad-gold`, `inset box-shadow`
- **Mobile drawer**: `transform: translateX(-100%)` + `is-open` class ile `translateX(0)`, easing `cubic-bezier(.4,0,.2,1)`, 0.3s

### Header
- Desktop: **header yok**, h1 doğrudan content içinde
- Mobile only: `.mobile-topbar` — sticky top, 60px yükseklik, `--ad-card` bg, hamburger (44×44) + brand + logout (44×44)

### Content area
- `flex: 1`, `padding: 24px 32px` (`--ad-sp-6 --ad-sp-8`), desktop `margin-left: 220px` (sidebar fixed offset)
- Max-width: `none` — full-width (Phase YZ-ADMIN-WIDTH); 4K'da `max-width: 1600px` cap + auto margin
- Mobile content padding: `16px 14px 80px` (alt boşluk sticky save bar için)

### Footer
- Yok. Sidebar-foot kullanıcı çıkışı görevini görür.

---

## 4. Component katalogu

### 4.1 Button (.btn)
Hierarchy: primary (yeşil dolu) → secondary (ghost yeşil border) → danger (kırmızı). `inline-flex` align center, gap 8px.

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px 16px;
  border-radius: 8px;                        /* --ad-r-sm */
  font: 500 13px var(--ad-font);
  background: #2d5e3e;                       /* --ad-green */
  color: #fff;
  border: 1px solid #3a7a51;                 /* --ad-green-light */
  box-shadow: 0 1px 0 rgba(255,255,255,.05) inset,
              0 4px 12px -4px rgba(0,0,0,.4);
  transition: transform .15s, box-shadow .15s, background .15s;
}
.btn:hover  { background: #3a7a51; transform: translateY(-1px);
              box-shadow: 0 1px 0 rgba(255,255,255,.08) inset,
                          0 8px 18px -6px rgba(45,94,62,.5); }
.btn:active { transform: translateY(0); }
.btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(45,94,62,.16); }

.btn-sm        { padding: 6px 11px; font-size: 12px; }
.btn-secondary { background: transparent; color: #3a7a51;
                 border: 1.5px solid #3a7a51; height: 42px; }
.btn-secondary:hover { background: #2d5e3e; color: #fff; }
.btn-danger    { background: #ef4444; border-color: #dc2626; }
```

### 4.2 Card (.card)
```css
.card {
  background: #16202b;
  border: 1px solid #222b36;
  border-radius: 12px;                       /* --ad-r-md */
  box-shadow: 0 2px 6px -2px rgba(0,0,0,.4); /* --ad-shadow-sm */
  padding: 22px;
}
```
Stat card için 3D shadow: `0 14px 28px -16px rgba(0,0,0,.5), 0 6px 12px -8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)` + sol kenar 3px gradient strip (`linear-gradient(180deg, --ad-green-light, --ad-green)`).

### 4.3 Form input
```css
input, textarea, select {
  background: #1e2a36;                       /* --ad-elev */
  color: #e6e8eb;
  border: 1.5px solid #2a3340;
  border-radius: 8px;
  padding: 9px 12px;
  font: 13px var(--ad-font);
  transition: border-color .15s, box-shadow .15s, background .15s;
}
input:focus {
  outline: none;
  border-color: #3a7a51;
  background: #1a2632;
  box-shadow: 0 0 0 3px rgba(45,94,62,.16);  /* --ad-shadow-glow */
}
input::placeholder { color: #6b7689; }
label              { font: 500 13px; color: #cbd1d8; margin-bottom: 6px; }
.help              { font: italic 12px; color: #9aa4b2; margin-top: 4px; }
```

Search input özel: 42px yükseklik, 10px radius, sol 42px padding (SVG mask ikon), `border-color` focus → green + `box-shadow: 0 0 0 3px green-glow`.

Checkbox/radio: `accent-color: #3a7a51`, 16×16.

### 4.4 Table (.list / .table)
```css
table.list {
  background: #16202b;
  border: 1px solid #222b36;
  border-radius: 16px;                       /* --ad-r-lg */
  overflow: hidden;
  border-collapse: separate; border-spacing: 0;
  box-shadow: 0 8px 24px -10px rgba(0,0,0,.5);
}
table.list thead th {
  background: linear-gradient(180deg, #1e2a36, #16202b);
  color: #cbd1d8;
  font: 600 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  padding: 12px 16px;
  border-bottom: 2px solid #2d5e3e;          /* brand under-line */
  position: sticky; top: 0;
}
table.list tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid #222b36;
  font-size: 13px; color: #cbd1d8;
}
table.list tbody tr:hover td { background: #1a2a36; }
```
Mobile (≤760px): `table.list` → kart formuna dönüşür (`display: block`, satırlar 12px radius card; her hücre `data-label` attr ile sol uppercase label + sağ değer flex layout). Otomatik JS `data-label` enjekte eder (admin.js).

### 4.5 Modal / Sheet
```css
.modal, dialog {
  background: #16202b;
  color: #e6e8eb;
  border: 1px solid #2a3340;
  border-radius: 16px;
  box-shadow: 0 20px 50px -20px rgba(0,0,0,.6); /* --ad-shadow-lg */
  padding: 0;
}
.modal-backdrop {
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(6px);
}
.modal-head { padding: 16px 20px; border-bottom: 1px solid #222b36;
              display: flex; justify-content: space-between; font-weight: 600; }
.modal-body { padding: 20px; }
.modal-foot { padding: 12px 20px; border-top: 1px solid #222b36;
              background: rgba(0,0,0,.18);
              display: flex; gap: 8px; justify-content: flex-end; }
.sheet-handle { width: 44px; height: 4px; background: #3a4555;
                border-radius: 9999px; margin: 8px auto; }
```

### 4.6 Badge / Chip / Toggle
```css
.st-toggle, .st-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 9999px;
  font: 600 11px; letter-spacing: .04em;
  text-transform: uppercase;
}
/* ON */
.st-toggle.on  { background: rgba(34,197,94,.14); color: #86efac;
                 border: 1px solid rgba(34,197,94,.35); }
/* OFF */
.st-toggle.off { background: rgba(107,118,137,.14); color: #9aa4b2;
                 border: 1px solid #2a3340; }
.st-toggle:hover { transform: translateY(-1px);
                   box-shadow: 0 2px 6px -2px rgba(0,0,0,.4); }
```
Action badges (audit-log): `.act-create` (yeşil), `.act-update/toggle` (mavi), `.act-delete/purge` (kırmızı), `.act-login` (sarı). Hep 11px uppercase pill.

### 4.7 Loader / Skeleton
```css
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #2a3340;
  border-top-color: #3a7a51;
  border-radius: 50%;
  animation: ad-spin .8s linear infinite;
}
@keyframes ad-spin { to { transform: rotate(360deg); } }

.skeleton {
  background: linear-gradient(90deg, #1e2a36 0%, #222d3a 50%, #1e2a36 100%);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: ad-skeleton 1.4s ease-in-out infinite;
}
@keyframes ad-skeleton {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 5. Etkileşim

### Page transition (soft refresh)
**Görülmedi.** Yaprakzade admin'inde JS-driven page transition (pjax / view-transition / fetch swap) yok. Tam SSR navigasyon — her tık sayfa yeniden yüklenir.

JS davranışı: `assets/admin.js`'de sadece (i) sidebar accordion state persist (`sessionStorage`), (ii) sidebar nav scroll persist (sayfalar arası nav `scrollTop` korunur), (iii) mobile drawer open/close, (iv) table → card `data-label` enjeksiyonu. Yumuşak hissin kaynağı CSS transition'ları + sidebar scroll restore.

### Animasyon süreleri
| Token | Süre | Kullanım |
|---|---|---|
| `--ad-dur-fast` | 0.15s | input border, btn hover, color |
| `--ad-dur-med` | 0.25s | stat hover lift, details disclosure |
| `--ad-dur-slow` | 0.4s | (rezerv) |

### Easing
| Token | Curve | Kullanım |
|---|---|---|
| `--ad-ease` | `cubic-bezier(.16, 1, .3, 1)` | "premium out" — çoğu hover/focus |
| `--ad-ease-soft` | `cubic-bezier(.4, 0, .2, 1)` | drawer slide (Material standard) |

### Hover/Active patternleri
- Btn primary: `translateY(-1px)` + drop shadow yoğunlaşır
- Sidebar link: `translateX(2px)` + arka plan `rgba(green,.10)`
- Stat card: `translateY(-3px)` + büyük shadow (`0 24px 40px -20px`)
- Table row: arka plan `#16202b → #1a2a36`
- Details summary chevron `›`: `transform: rotate(90deg)` (open state)
- `:focus-visible` global: `box-shadow: 0 0 0 3px rgba(45,94,62,.16)` (green glow ring)
- `prefers-reduced-motion`: sidebar transform/transition kapatılır

---

## 6. İkon seti

- **Kütüphane**: Yok — **Unicode emoji** kullanılıyor (sidebar nav `icon` field, ör. `📊 🛒 💵 🧪 📦 🏷️ 🖼️ 🎬 🌿 📝 ⭐ 🤝`)
- Search icon ve summary chevron: **inline SVG mask** (`-webkit-mask-image: url("data:image/svg+xml;…")`) — `background-color` ile token rengi alır, focus state'te `--ad-green-light`'a geçer
- Mobile logout: `⎋` (U+2387)
- Mobile menu close: `×` (multiplication sign)

### En sık kullanılan 10 ikon (sidebar)
1. `📊` Panel/Dashboard
2. `🛒` Siparişler
3. `💵` Finance
4. `📦` Ürünler
5. `🏷️` Kategoriler
6. `🖼️` Slider
7. `📝` Blog
8. `⭐` Yorumlar
9. `🤝` Referanslar
10. `🧪` Formül önerileri

Port notu: Next.js admin'de lucide-react eşleştirmesi → BarChart3, ShoppingCart, Banknote, Package, Tag, Image, FileText, Star, Handshake, FlaskConical.

---

## 7. Premium dokunuş

- **H1 gradient text**: `linear-gradient(135deg, #e6e8eb 0%, #c9a96e 200%)` + `background-clip:text` → başlıkta beyaz→altın geçiş
- **Body atmosphere**: fixed `::before` ile sağ-üst yeşil + sol-alt altın çok yumuşak radial gradient (opacity 5-8%)
- **Sidebar gradient**: `linear-gradient(180deg, #131b25, #0f161f)` — düz dark değil; üst hafif aydınlık
- **Active nav link**: yatay gradient `linear-gradient(90deg, green-tint-22%, green-tint-6%)` + 3px altın sol border + inset top highlight
- **Stat card 3D shadow**: 3 katmanlı (`0 14px 28px -16px black, 0 6px 12px -8px black, inset 0 1px 0 white-4%`) + sol 3px brand strip
- **Stat hover lift**: `translateY(-3px)` + dramatic shadow (`0 24px 40px -20px`)
- **Table header underline**: 2px brand-green border-bottom (sticky thead)
- **Glassmorphism**: `ce-savebar` ve modal-backdrop `backdrop-filter: blur(12px)` + yarı-saydam sürface gradient
- **Focus glow**: tüm interactive element'te 3px `rgba(45,94,62,.16)` ring (`:focus-visible`)
- **Btn hover micro-lift**: -1px translate + yoğunlaşmış colored shadow (yeşil/kırmızı/altın)
- **WhatsApp aksiyonu** (orders detail): `#25d366` solid + green colored shadow `0 4px 12px -4px rgba(37,211,102,.5)`, hover'da büyür
- **Selection color**: `::selection { background: #2d5e3e; color: #fff; }` (brand)
- **Scrollbar**: 10px width, thumb `#2a3340` (border 2px bg), hover `#3a4555`; sidebar nav scrollbar 6px brand-green thumb
- **Total satırı** (sepet özet): brand-green border-top 2px + `font-size: 17px / weight: 800` + altın-yeşil gradient text fill
- **Müşteri notu highlight**: sol 3px altın border + `rgba(gold,.10)` arka plan
- **Sidebar group accordion**: aynı anda 1 grup açık (Material-style disclosure, native `<details>` + JS senkron)
- **prefers-reduced-motion** desteği: motion-sensitive kullanıcılar için transform/transition kapanır

---

## Port checklist (özet)

| Kategori | Yaprakzade | Yapgitsin Next.js port karşılığı |
|---|---|---|
| Renk | CSS vars `--ad-*` | Tailwind config `colors.brand.green / gold` + CSS vars |
| Font | Inter system stack | `next/font/google` Inter |
| Layout | Fixed sidebar 220px + drawer | `<aside>` + `<main>` flex; mobile sheet (Radix Dialog) |
| Sidebar accordion | `<details>` + sessionStorage | Radix Accordion controlled state |
| Table → mobile card | CSS only + JS `data-label` | Aynı yaklaşım veya `@container` queries |
| Modal | `<dialog>` / inline overlay | Radix Dialog + aynı token'lar |
| İkon | Emoji | lucide-react (eşleştirme tablosu §6) |
| Page transition | Yok (SSR full reload) | Next.js App Router `loading.tsx` + `<Suspense>` skeleton — Yaprakzade'de yok ama Next'te ücretsiz kazanım |
| Skeleton/Spinner | `ad-skeleton` shimmer + spinner | birebir port |
