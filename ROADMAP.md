# Yapgitsin Roadmap

108 phase ile core platform tamamlandı. Bu dokuman, post-launch yol haritasını ve opsiyonel Phase 110+ önerilerini içerir.

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

## Phase 110+ (post-launch ideas — opsiyonel)

- **110:** Worker subscription model (commission alternatifi — sabit aylık)
- **111:** Booking calendar customer-facing wizard genişletme
- **112:** Geo-fencing (radius-based discovery + dynamic pricing)
- **113:** Push notifications (FCM real, şu an placeholder)
- **114:** Multi-currency support (€, AZN, USD)
- **115:** Worker bulk operations admin (toplu suspend, toplu kategori atama)
- **116:** AI-powered fraud detection (sahte ilan + duplicate worker detect)
- **117:** Dispute resolution flow (müşteri-usta arası şikayet çözüm)
- **118:** Loyalty program (returning customer rewards, token bonus)
- **119:** Worker insurance partnership (ilave gelir + güven)
- **120:** White-label SaaS (diğer pazarlara hizmet platformu olarak satış)

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
