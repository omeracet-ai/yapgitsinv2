# Yapgitsin — PHASES (Tek Kayıt)

**Son güncelleme:** 2026-05-26
**Politika:** Proje phase kayıtları **yalnız bu dosyada** tutulur. Eski `D:/müdür/*phase*.md` dosyaları arşiv/tarihsel referans; yeni phase'ler buraya yazılır.

---

## Aktif Sprint (2026-05 → 05-26)

### Paket A-G + İlişkili Phase'ler

| Paket / Phase | Tarih | Açıklama | Anahtar Commit'ler |
|---|---|---|---|
| **Paket A** | 05-23 | Register'da "Usta olarak kayıt ol" toggle kaldırıldı (single-user model) | bkz. session özet |
| **Paket B / Phase 263** | 05-26 | `User.workerDocuments` simple-json + `/users/me/documents` (GET/POST/DELETE) + buildPublicProfile expose | `0ce2b50c` |
| **Paket C** | 05-26 | Profil ekranlarına "Usta" rozeti + belge-detay kartı (`WorkerDocumentsCard`) | `0ce2b50c` |
| **Paket D** | 05-26 | Profil > Belgelerim ekranı (FAB upload, kategori picker) + route `/belgelerim` | `0ce2b50c` |
| Phase 263 fix | 05-26 | `/users/:id/customer-profile` `null` → `BadRequestException` (Flutter cast-crash önlendi) | `0ce2b50c` |
| **Paket E** | mevcut | Profile completeness — `computeProfileCompletion` + `ProfileCompletionCard` (zaten vardı) | — |
| Yapgitsin Refactor | 05-26 | HizmetAlScreen sadeleşti (CTA + Fırsatlar tek scroll); 3 alt-tab kaldırıldı | `01da2780` |
| Tab Refactor | 05-26 | "+ İlan Ver" sekmesi + 2 FAB gizlendi; BottomNav 5→4 | `9e62c807` |
| UI Compaction | 05-26 | `_OpportunityCard` 280px→80px (4x density); ekran başına 3-4→8-10 ilan | `92eab08e` |
| İşlerim sub-tab | 05-26 | "Fırsatlar" sub-tab kaldırıldı (3 tab: Taleplerim/Hizmetlerim/Tekliflerim) | `5586647a` |
| Theme Toggle | 05-26 | Yeşil → dark green → black → headerDark #161B22 (final, content surface) | `4ea018bb` → `568efeac` |
| Logo Swap | 05-26 | Splash/Yaptır hero/Onboarding "Y" placeholder → launcher icon (assets/icons/app_icon.png) | `afa49dac` |
| Sheet SafeArea | 05-26 | 28 `showModalBottomSheet` çağrısına `useSafeArea: true` (sistem nav bar altında ezilme fix) | `a3becb67` |
| Müşteri Profil | 05-26 | Yorum Yaz & Değerlendir CTA + 5-yıldız sheet + canlı toplam yorum/ilan sayısı + dark theme renkler | `0e217e00`, `af989863` |
| Offer Card Compact | 05-26 | Teklif kartı dense layout + "Bu Ustaya Özel İlan Aç" CTA + chart empty state | `79828590` |
| Price Fallback | 05-26 | `priceMinor` fallback (Phase 174 deprecate'i sonrası null göstergesi düzeltildi) | `148e53f3` |
| **Paket G** | 05-26 | Success screen ikinci CTA ("Yeni İlan Ver") + PostJobScreen targetWorker banner | `e2ca0548` |
| **Phase 264** | 05-26 | Provider entity deprecate; `User.featuredOrder` tek kaynak; admin `PATCH /admin/users/:id/featured-worker` | `29e63abf` |

### Bekleyenler (Defer)
- **Paket F**: Kategori UI sadeleştirme (tab simplification kısmen yapıldı)
- Backend Plesk deploy: customer-profile yeni alanlar + 404 fix + workerDocuments endpoints
- Backend private listing gating (PostJobScreen targetWorkerId field eşleştirmesi)
- Admin panel: `/admin/providers` → `/admin/users/workers` migration

---

## Arşiv: Önceki Phase'ler (D:/müdür/*.md kaynağından)

### Yapgitsin (221, 255+)
| # | Tarih | Açıklama | Kaynak |
|---|---|---|---|
| 221 | 2026-05 | Premium Dark Soft Skinning (theme tokens) | `D:/müdür/221_phase_design_skinning.md` |
| 255 | 2026-05-20 | JWT & Auth Security Hardening + Deploy Checklist | `255_phase_jwt_security_hardening.md`, `255_deploy_checklist.md` |
| 256 | 2026-05-20 | KVKK Compliance & Consent UI | `256_phase_kvkk_compliance.md` |
| 257 | 2026-05-20 | Database Integrity & PG Migration Readiness | `257_phase_database_integrity.md` |
| 258 | 2026-05-20 | Deployment & IIS Hardening | `258_phase_deployment_hardening.md` |
| 259 | 2026-05-20 | AI Cost Guard & Reliability | `259_phase_ai_cost_guard.md` |
| 260 | 2026-05-20 | UI Polish & Design System Coherence | `260_phase_ui_polish.md` |
| 261 | 2026-05-23 | Wilson Score + Bayesian Sıralama Optimizasyonu (`sortBy=smart` default) | `261_phase_fair_rating_sorting.md`, commit `889102e0` |
| 262 | 2026-05-23 | Counter-offer her iki marketplace, leaf-aware tree | `262_phase_counter_both_marketplaces.md`, commits `14c079a1`/`29ece226` |
| 263 | 2026-05-26 | workerDocuments + customer-profile fix | `0ce2b50c` |
| 264 | 2026-05-26 | Provider entity deprecate | `29e63abf` |

### Yaprakcay (153-160) — ayrı projeye taşınmalı
| # | Tarih | Açıklama | Kaynak |
|---|---|---|---|
| 153 | 2026-05-11 | Airtasker-Style Template + Tailwind v4 Tokens | `153_phase_airtasker_redesign.md` |
| 154 | 2026-05-11 | Build Error Fix (useSearchParams boundary) | `154_phase_build_fix.md` |
| 155 | 2026-05-11 | City Pages Expansion (SSR/ISR) | `155_phase_city_pages_expansion.md` |
| 156 | 2026-05-11 | Deploy Verification + FTP Upload | `156_phase_deploy_verification.md` |
| 158 | 2026-05-11 | Post-Deploy Verification + Next Phase Planning | `158_phase_post_deploy.md` |
| 159 | 2026-05-11 | Feature Roadmap Options + Search & Filter | `159_phase_options.md`, `159_phase_search_filter.md` |
| 160 | 2026-05-11 | Lead Form + Email Flow | `160_phase_lead_form_email.md` |

> Yaprakcay phase'leri Yaprakcay proje deposunda kendi `PHASES.md`'sine taşınmalı (ayrı turda).

---

## Güncelleme Kuralı

1. Her yeni iş paketi/phase tamamlandığında bu dosyaya bir satır ekle: `| Phase X / Paket Y | YYYY-MM-DD | açıklama | commit-hash |`.
2. Müdür `D:/müdür/*phase*.md` dosyalarına **yeni phase yazılmaz** — yalnız bu dosya güncellenir.
3. Bekleyenler bölümü her dispatch sonu güncellenir.
4. CLAUDE.md "Commit Geçmişi" bölümü en son 10-15 commit kalmalı (kısa); detay buradadır.
