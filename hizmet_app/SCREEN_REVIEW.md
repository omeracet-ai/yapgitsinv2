# Screen-by-Screen Review Log

Manual emulator pass started 2026-05-17. Notes accumulate as we walk every route together; fixes batched after the pass.

## Findings

### `/giris-yap` (Hoş Geldiniz! login) — 2026-05-17
- ✅ Full screen rendered correctly when given enough boot time (prior "missing CTA" finding was a false negative — screenshot taken mid-render).
- 🐛 **TYPO**: "Gooale ile devam et" → should be "Google ile devam et".
- ⚠️ Apple sign-in absent (only Google). Confirm with product whether Apple-on-iOS is required for App Store policy.

### Escrow flow — 2026-05-19 22:50 (Müdür live test post-hard-restart)
- ✅ `POST /escrow/hold` artık 200/400 dönüyor — 500 crash gitti ([f6bc3720](.) commit doğrulandı). Demo customer (demo@yapgitsin.tr) → confirmed booking 0c0a16b2 üzerinde hold `held` state'inde başarılı.
- 🐛 **BUG #1 — Escrow `amountMinor` null**: `/escrow/booking/:id` response'unda `amount: 1200` doğru ama `amountMinor: null`. Phase 174c minor-unit migration ([86e95968](.)) `booking_escrows` tablosu için backfill yapmamış. Frontend yeni ekranlar minor-unit beklerse Türk Lirası gösterimi bozulur.
- 🐛 **BUG #2 — Dual escrow tablosu (Phase 174 vs Phase 253 mismatch)**: `/escrow/hold` `booking_escrows` tablosuna yazıyor (`BookingEscrowService`), ama `/escrow/:id/confirmation/*` endpointleri `payment_escrows` tablosunu okuyor (`EscrowConfirmationService`). Sonuç: hold'dan sonra confirmation flow başlatılamıyor — escrow id `ee9d3898…` ile `/confirmation/state` çağrısı `404 Escrow not found` dönüyor. Karşılıklı onay akışı (QR + foto + opsiyonel video) **production'da bağlantısız**. Phase 253 confirmation flow'un Phase 174 escrow'una köprüsü yok.

### Profile screen → Email Doğrulama — 2026-05-19 22:53
- 🐛 **BUG #3 — "Null check operator used on a null value" crash** (kullanıcı raporu): [firebase_auth_service.dart:66](lib/core/services/firebase_auth_service.dart#L66) `_auth.currentUser!.sendEmailVerification()` çağırıyor. Phase 222 (Firestore→REST) sonrası kullanıcılar backend JWT ile login oluyor, Firebase Auth currentUser null. Bang operatörü null'a uygulandığında runtime crash.
- ✅ **Fix uygulandı**: [firebase_auth_repository.dart](lib/features/auth/data/firebase_auth_repository.dart) — `requestEmailVerification()` ve `confirmEmailVerification()` artık backend `POST /auth/verify-email/{request,confirm}` çağırıyor. Firebase yolu tamamen kaldırıldı. `flutter analyze` 0 issue.
