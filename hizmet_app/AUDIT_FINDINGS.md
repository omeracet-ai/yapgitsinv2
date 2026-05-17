# Voldi-audit findings — 2026-05-17

Static sweep of `hizmet_app/lib/` (Flutter) ve `nestjs-backend/src/` (NestJS) — kod yazılmadı, sadece tespit. Müdür ekranda manuel review yaparken parallel edit yok. Voldi-fs paralel olarak responsive/SafeArea/overflow konularını ele alıyor; bu rapor onları kapsam dışı tutar.

## P0 — broken at runtime (would crash / 404 / unauthorized)

- `features/providers/data/provider_repository.dart:61,73,82,97,113,122,131` — Tüm `/providers/*` ve `/providers/by-user/$userId` + `/providers/$providerId/completed-jobs` çağrıları 404. Backend `providers.controller.ts` boş: `// Provider sistemi kaldırıldı`. Provider listesi/profili komple çöker. Fix: repo'yu `/users/workers/*` veya `/users/$id/profile` API'sine taşı.
- `features/photos/data/portfolio_repository.dart:29` — `DELETE /users/me/portfolio/$id` çağrısı. Backend yalnız `@Delete('me/portfolio')` (body ile url alıyor) var, `:id` route yok → 404. Fix: backend'e id route ekle veya repo'yu url-body imzasına çevir (photo_repository.dart:51 zaten doğru kullanıyor).
- `custom_code/actions/ai_assistant_action.dart:21` — `https://api.yapgitsin.tr/v1/ai/assistant` URL'i hardcoded. Backend route'u `/ai/assistant` (v1 prefix yok) → 404. Fix: `ApiConstants.baseUrl + '/ai/assistant'`.
- `custom_code/actions/gemini_chat_action.dart:20` & `claude_chat_action.dart:20` — Doğrudan Google/Anthropic public API'sine apiKey parametresiyle POST. App içinden API key gönderiliyor; üretimde key bundle'da → leak. Backend `/ai/chat` zaten var, kullanılmıyor. Fix: bu iki dosyayı sil veya `/ai/chat`'e yönlendir.
- `features/auth/widgets/availability_editor_sheet.dart:157` — `PUT /users/availability` çağrısı. Backend route `users/availability` (controller prefix `users`) ile eşleşiyor ama Dart leading slash → mutlak path `/users/availability` doğru. ✅ no-op (verified, keeping for completeness). [DELETE]
- `core/services/firebase_auth_service.dart:195` — Empty `catch (_) {}` profil refresh hatasını yutuyor; UI auth state stale kalabilir. Log + rethrow gerek.

## P1 — visible UX gap (user-facing, blocks task completion)

- `features/chat/presentation/screens/chat_detail_screen.dart:365` — AppBar `more_vert` IconButton `onPressed: () {}` boş. Mesaj sil/bildir/sessize al menüsü yok; sohbet moderasyonu eksik.
- `features/jobs/presentation/screens/job_detail_screen.dart:949` — Teklif veren avatar GestureDetector `onTap: null` → tıklanıyor görüntüsü veriyor ama profil açmıyor. `context.push('/usta/$workerId')` bağla.
- `features/auth/presentation/screens/profile_screen.dart:1087` — "Ödeme yönetimi yakında eklenecek" SnackBar stub; menüde kart var ama feature yok. Ya kartı gizle ya wallet ekranına bağla.
- `features/wallet/presentation/screens/iyzico_payment_screen.dart:37` — `TODO(phase-248-wire): call-site'lar BuyerInfo'yu explicit geçmeye…` — checkout başlatıcılar BuyerInfo dummy gönderiyor, iyzico KYC reject riski. Phase 252 acık iş.
- `features/auth/presentation/screens/login_screen.dart:215-233` — "veya" divider + sosyal butonlar sosyal sign-in başarısızsa hiçbir hata UI vermiyor (`_loginWithGoogle/_loginWithApple` async fire-and-forget, sadece notifier dinleniyor); Google iptal edilirse silent fail.
- `features/auth/presentation/screens/login_screen.dart:98` — Email doğrulanmamışsa `context.push('/verify-email')` çağrılıyor ama go_router refresh redirect zaten `/` 'a dönmüş olabiliyor → SnackBar gözükmeden navigate olmuyor. Conditional return missing.
- `features/auth/presentation/screens/sms_verify_screen.dart` — router'da `_publicPaths` içinde ama "Vazgeç" buton UX gap'i memory'de açık (P1 queue: Phase 252-D notu).
- `lib/features/calendar/presentation/earnings_screen.dart:4` — Earnings özelliği `wallet/data/payment_repository.dart` import ediyor; router `/kazanclarim` ayrı `earnings_screen.dart` kullanıyor — iki paralel earnings ekran var, hangisinin canlı olduğu belirsiz.
- `features/providers/presentation/screens/provider_list_screen.dart:325` — "Yakında bölgenize uygun ustalar burada listelenecek" empty state — ama P0 maddesindeki provider repo zaten 404 dönecek, kullanıcı her zaman bu metni görür.
- `core/router/app_router.dart:373` — `/chat/:roomId` route `peerName: roomId, peerId: roomId` geçiyor. peerName insan ismi olmalı; başlıkta UUID gösteriyor. Deep link tıklayan kullanıcı kim olduğunu göremez.
- `core/router/app_router.dart:106` — `/chat` `_protectedPrefixes` içinde ama tek `GoRoute('/chat/:roomId')` var; çıplak `/chat` rotası tanımlı değil → kullanıcı `/chat` linkine girerse 404 yerine "no route" exception.
- `core/router/app_router.dart:78` — `/profil/`, `/musteri/`, `/usta/`, `/ilan/` public prefix; ama public kullanıcı `/musteri/:id` veya `/usta/:id` üzerinden private detayları (telefon, email) görebiliyor mu? Backend `users/:id/profile` field-mask kontrolü olmazsa PII leak.
- `lib/features/providers/widgets/worker_filter_sheet.dart` ve `lib/features/jobs/data/job_repository.dart` — filtre uygulama UX'i hızlıca dispatch ediyor ama sonuç olmadığında "filtreyi sıfırla" CTA yok (provider list zaten boş).
- `features/auth/data/firebase_auth_repository.dart:312` — `setupTwoFactor` catch içinde `{'secret': '', 'qrDataUrl': ''}` döndürüyor; UI boş QR gösterip kullanıcı "kurdum" sanıyor. Hata propagate edilmeli.

## P2 — dead code / cleanup

- `features/providers/data/provider_repository.dart` — Backend boş olduğu için bu repo tamamen dead code. 7 method silinebilir veya users service'e refactor.
- `nestjs-backend/src/modules/providers/providers.controller.ts` — Boş controller; module reference de kaldırılmalı (var ise app.module.ts'den çıkar).
- `lib/custom_code/actions/gemini_chat_action.dart`, `claude_chat_action.dart`, `ai_assistant_action.dart` — FlutterFlow legacy aksiyonları; `lib/features/ai/data/ai_repository.dart` zaten backend'i kullanıyor. Üçü de silinmeli (security smell + dead).
- `lib/features/users/data/moderation_repository.dart` ve `user_actions_repository.dart` — Aynı block/report fonksiyonlarının iki kopyası (`/users/me/blocks/$userId` vs `/users/$userId/block`); ikisi de çağrılıyor. Tek implementation'a indir.
- `nestjs-backend/src/modules/promo/promo.controller.ts:45` (`@Get('promo/validate/:code')`) + `:56` (`@Get('promo/:code/validate')`) — Aynı işin iki route; biri legacy, dispatch zorlaştırıyor.
- `nestjs-backend/src/modules/disputes/general-disputes.controller.ts:34` (`@Controller('disputes')`) ve `disputes.controller.ts:73` (`@Controller('disputes')`) — İki controller aynı path'i paylaşıyor; route conflict riski (NestJS son register'ı kazanır).
- `nestjs-backend/src/modules/ai/ai.controller.ts:20` ve `:52` — `@Controller('ai')` iki kez deklare edilmiş; aynı dosyada iki sınıf controller'ı, register sıra önemli.
- `nestjs-backend/src/modules/escrow/booking-escrow.controller.ts` vs `escrow.controller.ts` — `/escrow/hold` ve `/escrow/initiate` paralel akışları; hangisi canonical belli değil.
- `nestjs-backend/src/modules/admin/admin.controller.ts:651` `@Get('analytics/overview')` ile `analytics/analytics.controller.ts:27` `@Get('overview')` tekrarı; admin altında ve `/analytics` altında iki yerden expose.
- `lib/features/calendar/presentation/earnings_screen.dart` — `earnings_screen.dart` zaten `lib/features/earnings/presentation/screens/earnings_screen.dart` ile çakışıyor; router earnings olanı kullanıyor, diğeri ölü.
- `core/router/app_router.dart:114` `// ignore: unused_element bool _isPublic(...)` — Fonksiyon hiç çağrılmıyor; redirect deny-by-default kullanıyor. Kaldır.
- `nestjs-backend/src/modules/reviews/reviews.controller.ts:35` `@Get('__diag/phase236')` — Phase 236 diagnostic endpoint prod'da hala açık.

## P3 — security & secrets

- `lib/firebase_options.dart:53,62` — Firebase Web/Android apiKey hardcoded (`AIzaSy…`). Firebase Web API keys teknik olarak public ama prod'da Firebase Console restrictions (HTTP referrer / package name) zorunlu — doğrulanmalı.
- `custom_code/actions/claude_chat_action.dart` & `gemini_chat_action.dart` — API key'i parametre olarak alıyor; bu key client kodunda saklanıyorsa APK reverse'ünde okunur. Cleanup (P2) ile birlikte sil.
- `nestjs-backend/src/modules/admin-seed/admin-seed.controller.ts:52,60,70` — `POST /admin/seed/wipe`, `populate`, `wipe-and-populate` — prod erişiminde guard kontrolü gerekiyor (sadece NODE_ENV != production). Wipe endpoint prod'da varsa veri kaybı tek istekle.
- `nestjs-backend/src/modules/maintenance/maintenance.controller.ts:24-68` — `backfill-coords`, `seed-demo-workers`, `seed-demo-jobs` admin-only mı? Auth guard ekli mi doğrulanmalı; demo seeder prod'a yazarsa kötü.
- `core/router/app_router.dart:74-79` — `/profil/:id`, `/musteri/:id`, `/usta/:id`, `/ilan/:id` public prefix → backend `/users/:id/profile` endpoint'inin response'unda email/phone/address gibi PII'leri mask ediyor mu? Memory'de "Phase 134 customer-profile no worker fields" var, ama worker tarafı için aynı maskeleme garanti değil.
- `nestjs-backend/src/modules/auth/auth.controller.ts:87` `@Post('admin/login')` — admin login endpoint'i public path'te (`/auth/admin/login`); brute force throttle kontrol et (P0 SMS throttle vardı, login için de gerek).
- `nestjs-backend/src/modules/health/health.controller.ts:72` `@Get('deep')` & `:86 @Get('db')` — DB internals (versiyon, connection count) public döndürüyorsa fingerprinting riski. AuthGuard veya internal-only IP kontrolü.
- `lib/features/auth/data/firebase_auth_repository.dart` — `2fa/setup` hata yutuluyor (P1'de geçti); 2FA secret backend'den boş gelirse user fake-enable yapabilir → kontrolsüz hesap.

---

Toplam: 40 finding (P0:6, P1:14, P2:13, P3:7). Voldi-fs'in responsive/overflow scope'u dışında tutuldu.
