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
Kullanım: Card default

#### Card Hover Shadow
```css
--shadow-card-hover: 0 14px 30px rgba(255, 90, 31, 0.12), 0 4px 10px rgba(17, 24, 39, 0.06);
```
Kullanım: Card:hover, CategoryCard:hover

#### FAB Shadow (Mobile)
```css
--shadow-fab: 0 10px 24px rgba(255, 90, 31, 0.35);
```
Kullanım: Floating action button, pronounced orange glow

---

## Component Tokens

### CategoryCard
- bg: white
- border: 1px var(--border)
- radius: var(--radius-card)
- shadow: var(--shadow-card)
- icon-bg: var(--primary-soft)
- icon-color: var(--primary)

### JobCard / PopularJob
- bg: white
- border: 1px var(--border-soft)
- radius: var(--radius-card)
- shadow: var(--shadow-card)
- verified-badge: var(--primary)
- rating-color: var(--accent)

### Hero Section
- bg-gradient: coral to orange
- text: white
- search-pill-bg: white
- cta-primary: var(--primary)
- cta-secondary: outline var(--secondary)

### TrustBand
- bg: var(--secondary)
- text: white
- accent-kpi: var(--accent)

---

## Uygulanacak Sayfalar (Phase 153)

✅ **Ana Sayfa:** Zaten uyumlu (Phase 167)
⏳ **Kategori Sayfası:** `/[kategori]/page.tsx` — token'lar + hero gradient
⏳ **Usta Detay:** `/ilan/[idSlug]/page.tsx` — hero redesign
⏳ **Blog:** `/blog/page.tsx` — tipografi sync
⏳ **Admin Panel:** Kurumsal sade kalacak

---

## CSS Variable Usage

Tailwind v4 @theme mapping:
```css
:root {
  --primary: #FF5A1F;
  --secondary: #2D3E50;
  --accent: #FFB400;
  --radius-card: 20px;
  --shadow-card: 0 6px 18px rgba(17, 24, 39, 0.06), 0 2px 4px rgba(17, 24, 39, 0.04);
  --shadow-card-hover: 0 14px 30px rgba(255, 90, 31, 0.12), 0 4px 10px rgba(17, 24, 39, 0.06);
  --shadow-fab: 0 10px 24px rgba(255, 90, 31, 0.35);
}
```
