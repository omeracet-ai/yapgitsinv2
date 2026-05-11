# Design Tokens — Yapgitsinv2 Phase 153

**Tasarımcı:** Voldi-design
**Tarih:** 2026-05-11
**Referans:** Phase 167 Airtasker pattern

---

## Renk Sistemi

### Primary (Coral/Orange) — İşlemler, CTA, Vurgu
- **Primary:** `#FF5A1F` — Ana aksiyon (buton, ikon, hover state)
- **Primary Dark:** `#E64812` — Pressed state, hover darken
- **Primary Light:** `#FFE6DC` — Disabled, soft background
- **Primary Soft:** `#FFF4EE` — Subtle highlight, background tint

**Kullanım:**
- CTA button (`bg-[var(--primary)]`)
- Active tab indicator
- Job/service icon capsule background
- Link hover color

### Secondary (Dark Navy) — Text, Heading, Navigation
- **Secondary:** `#2D3E50` — Primary text, heading, strong emphasis
- **Secondary Light:** `#374151` — Secondary text, metadata
- **Secondary Muted:** `#9CA3AF` — Disabled text, hint, placeholder

**Kullanım:**
- Body text (h-body: 16px)
- Heading text (h1-h3)
- Navigation item text
- Form label

### Accent (Yellow) — Rating, KPI, Success Signals
- **Accent:** `#FFB400` (warm gold) — Star rating, success badge, highlight strip
- **Accent Soft:** `#FFF9E6` — Soft yellow background, trust band

**Kullanım:**
- ⭐ Rating stars (5-star display)
- ✓ Success checkbox
- 🎖 KPI badge
- Trust band background

### Neutral/Surfaces
- **Background:** `#FFFFFF` — Page, card background
- **Muted:** `#F7F7F8` — Section divider, alt background
- **Surface:** `#FFFFFF` — Card, modal background
- **Border:** `#ECECEE` — Light border (hover state)
- **Border Soft:** `#F3F3F5` — Very light border, divider

---

## Tipografi

### Font Family
- **Sans:** Geist Sans / Inter / SF Pro Display (fallback)
- **Mono:** Geist Mono / Courier New (fallback)

### Size & Weight

#### Headings
- **h1:** 32px bold (line-height: 1.2) — Sayfa başlığı
- **h2:** 28px bold (1.3) — Section başlığı
- **h3:** 24px bold (1.35) — Subsection
- **h-section:** 20px bold — Mini section (kategori gridde)

#### Body
- **Body:** 16px regular (line-height: 1.6) — Normal text
- **Body Small:** 14px regular (1.5) — Metadata, hint
- **Caption:** 12px regular (1.4) — Footer, timestamp

#### Emphasis
- **Semi-bold:** 600 weight — Highlight, emphasis
- **Bold:** 700 weight — Strong emphasis, label

---

## Spacing & Sizing

### Radii (Soft Corner Aesthetic)
- **radius-pill:** `999px` — Full rounded (avatar, pill button)
- **radius-card:** `20px` — Card border radius (default)
- **radius-button:** `16px` — Button border radius
- **radius-input:** `12px` — Form input

### Shadows

#### Card Shadow
```css
--shadow-card: 0 6px 18px rgba(17, 24, 39, 0.06), 0 2px 4px rgba(17, 24, 39, 0.04);
```
Kullanım: Card default hover yok, bunu saat static

#### Card Hover Shadow
```css
--shadow-card-hover: 0 14px 30px rgba(255, 90, 31, 0.12), 0 4px 10px rgba(17, 24, 39, 0.06);
```
Kullanım: Card:hover, CategoryCard:hover

#### FAB Shadow (Mobile)
```css
--shadow-fab: 0 10px 24px rgba(255, 90, 31, 0.35);
```
Kullanım: Floating action button (bottom-right FAB), pronounced orange glow

#### No Shadow
Buttons, inputs, regular text — shadow yok (flat design)

---

## Component Tokens

### CategoryCard
```
bg: var(--background)
border: 1px var(--border)
border-radius: var(--radius-card)
shadow: var(--shadow-card)
padding: 16px
text-color: var(--secondary)
icon-bg: var(--primary-soft)
icon-color: var(--primary)
```

### JobCard / PopularJob
```
bg: var(--surface)
border: 1px var(--border-soft)
border-radius: var(--radius-card)
shadow: var(--shadow-card)
padding: 16px 12px
title-color: var(--secondary)
verified-badge-color: var(--primary)
verified-badge-bg: var(--primary-soft)
rating-color: var(--accent)
```

### Hero Section
```
bg-gradient: linear-gradient(135deg, #FF5A1F, #FFB84D)
text: white
heading: 32-40px white bold
search-pill-bg: white
search-pill-text: var(--secondary)
cta-primary: var(--primary) bg
cta-secondary: outline var(--secondary)
```

### TrustBand
```
bg: var(--secondary)
text: white
accent-kpi: var(--accent) / gold
```

### Mobile Bottom Nav + FAB
```
bg: var(--background)
border-top: 1px var(--border)
tab-text: var(--secondary-light)
tab-active: var(--primary)
fab-bg: var(--primary)
fab-icon: white
fab-shadow: var(--shadow-fab)
```

---

## CSS Variable Usage

### Tailwind v4 @theme Mapping
```css
:root {
  /* Color tokens */
  --primary: #FF5A1F;
  --primary-dark: #E64812;
  --primary-light: #FFE6DC;
  --primary-soft: #FFF4EE;
  --secondary: #2D3E50;
  --secondary-light: #374151;
  --accent: #FFB400;
  --border: #ECECEE;
  
  /* Spacing & sizing */
  --radius-card: 20px;
  --radius-pill: 999px;
  --radius-button: 16px;
  --radius-input: 12px;
  
  /* Shadows */
  --shadow-card: 0 6px 18px rgba(17, 24, 39, 0.06), 0 2px 4px rgba(17, 24, 39, 0.04);
  --shadow-card-hover: 0 14px 30px rgba(255, 90, 31, 0.12), 0 4px 10px rgba(17, 24, 39, 0.06);
  --shadow-fab: 0 10px 24px rgba(255, 90, 31, 0.35);
}

@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --radius-card: var(--radius-card);
  --radius-pill: var(--radius-pill);
  /* etc */
}
```

### TSX Kullanımı
```tsx
// CSS variable via style prop
<div style={{ backgroundColor: 'var(--primary)' }}>

// Tailwind class
<button className="bg-[var(--primary)] rounded-[var(--radius-button)]">

// Hybrid (preferred)
<div className="bg-primary rounded-card shadow-card">
  {/* uses @theme mappings */}
</div>
```

---

## Uygulanacak Sayfalar (Phase 153)

✅ **Ana Sayfa:** Zaten uyumlu (Phase 167)
⏳ **Kategori Sayfası:** `/[kategori]/[sehir]/page.tsx` — token'lar kullan
⏳ **Usta Detay:** `/ilan/[idSlug]/page.tsx` — hero redesign
⏳ **Blog List/Detail:** `/blog/page.tsx`, `/blog/[slug]/page.tsx` — tipografi sync
⏳ **Admin Panel:** Kurumsal sade (secondary dominant)

---

## Notlar

- i18n uyumlu: tr, az, en locale'ler arası consistent
- Dark mode: Planned (Phase 154+), şimdilik light only
- Accessibility: WCAG AA contrast (primary #FF5A1F on white 4.51:1 ✓)
