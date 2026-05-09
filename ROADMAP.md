# Yapgitsin Roadmap

150 phase ile core + revenue + compliance + AI katmanları tamamlandı. Bu dokuman, post-launch yol haritasını ve Phase 151+ önerilerini içerir.

## Pazar Timeline

### Q2 2026 — Soft Launch (Türkiye + KKTC)
- İlk 100 usta manuel seed (İstanbul temizlik + tesisat kategorilerinde)
- Marketing test: Google Ads + Instagram (~€2K test bütçe)
- KPI: ilk 30 gün 50 tamamlanmış iş, %30 retention
- Legal pages avukat onayı (Phase 102 placeholder -> production)

### Q3 2026 — Türkiye Genişleme
- Ankara + İzmir aktivasyonu
- Worker referral programı
- KPI: aylık 500 tamamlanmış iş, ~€10K GMV

### Q4 2026 — Azerbaycan Launch
- AZ i18n zaten hazır (Phase 90)
- Bakü pilot, yerel ödeme entegrasyonu
- Partnership: yerel hizmet derneği

### 2027 H1 — Kosova + Özbekistan
- Kosova: Türkçe + Arnavutça (ek i18n)
- Özbekistan: Özbekçe + Rusça
- KPI: 5K MAU cross-region

### 2027 H2 — Niş Liderliği
- İstanbul temizlik: #1 player hedefi
- Premium tier: doğrulanmış usta + sigorta partner

### 2028+ — MENA Expansion
- Mısır + Pakistan: büyük pazar, yüksek CAC
- Seed funding turu (€500K-1M) bu noktada gerek

## Phase 110-149 — DONE (shipped)

- **110:** Worker subscription model — DONE
- **111:** Booking calendar wizard — DONE
- **112:** Geo-fence radius + dynamic pricing — DONE
- **113:** FCM real push — DONE
- **114:** Multi-currency (€, AZN, USD) — DONE
- **115:** Worker bulk admin ops — DONE
- **116:** AI fraud detection — DONE
- **117:** Dispute resolution flow — DONE
- **118:** Loyalty / referral program — DONE
- **119:** Worker insurance partnership — DONE
- **120:** White-label tenant scaffold — DONE
- **121-123:** Email + JobPosting schema + SMS OTP — DONE
- **124-131:** KVKK, portfolio video, promo, lighthouse, cancel/refund, onboarding, DB perf, prod hardening — DONE
- **132, 137:** Moderation queue UI, manual badge granting — DONE
- **134, 140, 144, 145:** Semantic search, AI pricing, AI dispute mediation, customer enrichment — DONE
- **135, 136, 139, 149:** Availability calendar 2.0, escrow, chat attachments, booking reminders — DONE
- **138, 143:** Customer message templates, category subscription alerts — DONE
- **141, 146:** Worker earnings dashboard + boost + tier badges — DONE
- **142:** AI-driven web SEO content auto-gen — DONE
- **147, 148:** Web filter sidebar, isAvailable expose — DONE
- **150:** 150-phase milestone doc refresh — DONE

## Phase 151-160 (next batch — önerilen)

- **151:** Customer voice notes in chat (audio mesaj kaydı + playback)
- **152:** Worker video intro (1-min profil videosu, public profile hero)
- **153:** AI auto-translate chat messages (TR↔EN, multi-region için)
- **154:** Job marketplace stats public (toplam ilan / usta / başarı oranı homepage badge)
- **155:** Worker calendar sync (Google Calendar export — .ics feed)
- **156:** Customer wallet history PDF export (token + escrow geçmişi)
- **157:** Multi-photo job upload bulk (5 fotoğraf tek seferde, drag-drop UI)
- **158:** Web blog system (CMS for SEO — admin panelinden makale yayınlama)
- **159:** Worker certification system (sertifika upload + admin verify + profilde rozet)
- **160:** White-label tenant migration tool (mevcut platformdan tenant clone wizard)

## Teknik Borç

- Production secrets rotation policy
- Real OpenAPI SDK generate + npm publish
- E2E test coverage (şu an smoke test seviyesinde)
- Mobile app CI (Android AAB + iOS IPA build pipeline)
- Postgres migration runbook (SQLite -> Postgres production geçiş)

## Pazar Riskleri

1. **Armut toparlanması:** Q4 2026'ya kadar pencere açık varsayımı; toparlanırsa niş segmente sıkış
2. **Yasal değişiklik:** TR'de marketplace komisyonu regülasyonu olası (KDV netleştirme bekliyor)
3. **CAC enflasyonu:** Google Ads TR maliyeti 2024-2026 %200 arttı — organic SEO kritik
4. **Worker liquidity:** Two-sided marketplace klasik tavuk-yumurta; ilk 100 usta seed kritik

— Voldi & Müdür, Mayıs 2026
