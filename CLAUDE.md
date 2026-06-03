# Yapgitsin — CLAUDE.md

Türkiye pazarı için iki taraflı hizmet marketplace platformu. Müşteri ile usta (hizmet sağlayıcı) arasında köprü kurar.

---

## Proje Yapısı

```
Yapgitsinv2/
├── nestjs-backend/   # NestJS API — port 3001 (SQLite)
├── admin-panel/      # Next.js 16 admin paneli — port 3000
├── hizmet_app/       # Flutter 3.x mobil uygulama
└── backend/          # Eski Express backend — KULLANILMIYOR, dokunma
```

---

## Servis Başlatma

```bash
# NestJS backend
cd nestjs-backend && npm run start:dev

# Admin panel
cd admin-panel && npm run dev

# Flutter (Android emülatör)
cd hizmet_app && flutter run
# veya ngrok ile gerçek cihaz:
flutter run --dart-define=API_URL=https://xxxx.ngrok-free.app
```

---

## Veritabanı

- **SQLite** — `nestjs-backend/hizmet_db.sqlite` (otomatik oluşur)
- `.env` → `DB_TYPE=sqlite`
- TypeORM `synchronize: true` — entity değişince şema otomatik güncellenir
- PostgreSQL'e geçmek için `.env` → `DB_TYPE=postgres` + host/port/user/pass ekle
- Yeni field eklerken `simple-json` veya `simple-enum` kullan (SQLite uyumlu)
- `decimal` yerine `float` kullan (SQLite decimal'i string döner)

---

## Port Çakışması

```bash
# Port 3001 EADDRINUSE = zombie Node process
netstat -ano | grep 3001      # PID bul
taskkill /PID <pid> /F        # öldür
```

---

## Ortam Değişkenleri (nestjs-backend/.env)

```
PORT=3001
DB_TYPE=sqlite
JWT_SECRET=change_me_in_production_use_a_long_random_secret_here
ADMIN_INITIAL_PASSWORD=change_me_in_production
GEMINI_API_KEY=<Gemini Flash — tüm AI servisleri için zorunlu (Phase 281)>
ALLOWED_ORIGINS=<production'da virgülle ayır>
```

---

## Entities & Veri Modeli

### User (users tablosu)
Hem müşteri hem usta aynı entity. `workerCategories` doluysa usta.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid | PK |
| `fullName` | varchar(100) | |
| `phoneNumber` | varchar(20) unique | |
| `email` | varchar(255) unique nullable | |
| `passwordHash` | varchar nullable | bcrypt |
| `profileImageUrl` | varchar nullable | |
| `identityPhotoUrl` | varchar nullable | zorunlu doğrulama fotoğrafı |
| `documentPhotoUrl` | varchar nullable | opsiyonel belge |
| `identityVerified` | boolean default false | admin onaylı |
| `birthDate` | varchar(10) | YYYY-MM-DD |
| `gender` | varchar(10) | male/female/other |
| `city`, `district`, `address` | varchar/text | |
| `role` | enum(user, admin) | |
| `tokenBalance` | float default 100 | başlangıç 100 token |
| `asCustomerTotal/Success/Fail` | integer | müşteri istatistikleri |
| `asWorkerTotal/Success/Fail` | integer | usta istatistikleri |
| `averageRating` | float | review'dan hesaplanır |
| `totalReviews` | integer | |
| `reputationScore` | integer | `rating×20 + (customerSuccess+workerSuccess)×5` |
| `workerCategories` | simple-json | `["Temizlik","Elektrikçi"]` |
| `workerBio` | text nullable | |
| `hourlyRateMin/Max` | float nullable | |
| `serviceRadiusKm` | integer default 20 | |
| `isAvailable` | boolean default false | usta aktif mi |

### Job (jobs tablosu)
Müşterinin açtığı iş ilanı. Ustalar teklif verir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid | |
| `title` | varchar(200) | |
| `description` | text | |
| `category` | varchar(100) | denormalize ad |
| `categoryId` | varchar nullable | FK → categories |
| `location` | varchar(200) | |
| `budgetMin/Max` | float nullable | |
| `status` | enum(open,in_progress,completed,cancelled) | |
| `customerId` | varchar | FK → users |
| `photos` | simple-json | URL dizisi, max 3 |
| `videos` | simple-json | Video URL dizisi, max 5 |
| `featuredOrder` | integer nullable | 1-3 öne çıkan sırası |

### JobQuestion (job_questions tablosu)
İş ilanına sorulan herkese açık sorular (Airtasker tarzı Q&A).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid | |
| `jobId` | FK → jobs | |
| `userId` | FK → users | soruyu soran usta |
| `text` | text | soru metni |
| `photoUrl` | varchar nullable | opsiyonel fotoğraf |
| `createdAt` | timestamp | |

**Erişim kuralı:** Soru sormak için o ilana teklif verilmiş olması gerekir (Karar B — teklif ödemesi Questions erişimini de açar). Sorular herkese görünür.

### JobQuestionReply (job_question_replies tablosu)
Sorulara verilen yanıtlar.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | uuid | |
| `questionId` | FK → job_questions | |
| `userId` | FK → users | ilan sahibi veya soruyu soran |
| `text` | text | |
| `createdAt` | timestamp | |

### Offer (offers tablosu)
İş ilanına gelen teklif.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `jobId` | FK → jobs | |
| `userId` | FK → users | teklif veren usta |
| `price` | float | |
| `message` | text nullable | |
| `status` | enum(pending,accepted,rejected,withdrawn,countered) | |
| `counterPrice` | float nullable | pazarlık fiyatı |
| `counterMessage` | text nullable | |

### ServiceRequest (service_requests tablosu)
Hizmet isteği (müşteri ilanı, ustalar başvurur). Job'dan farklı akış.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `userId` | FK → users | ilanı açan müşteri |
| `category`, `categoryId` | | |
| `title`, `description` | | |
| `location`, `address` | | |
| `imageUrl` | varchar nullable | tek fotoğraf |
| `latitude` | float nullable | harita koordinatı |
| `longitude` | float nullable | harita koordinatı |
| `price` | float nullable | DB'de tutulur, UI'da gösterilmez |
| `status` | enum(open,closed) | |
| `featuredOrder` | integer nullable | |

### ServiceRequestApplication (service_request_applications)
ServiceRequest'e başvuru.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `serviceRequestId` | FK | |
| `userId` | FK → users | başvuran usta |
| `message` | text nullable | |
| `price` | float nullable | |
| `status` | enum(pending,accepted,rejected) | |

### Booking (bookings tablosu)
Direkt randevu — müşteri ustaya randevu ister.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `customerId`, `workerId` | FK → users | |
| `category`, `subCategory` | | |
| `description`, `address` | | |
| `scheduledDate` | varchar(20) YYYY-MM-DD | |
| `scheduledTime` | varchar(10) nullable HH:MM | |
| `status` | enum(pending,confirmed,in_progress,completed,cancelled) | |
| `agreedPrice` | float nullable | |
| `workerNote`, `customerNote` | text nullable | |

### Review (reviews tablosu)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `jobId` | FK nullable | hangi iş için |
| `reviewerId` | FK → users | yazan |
| `revieweeId` | FK → users | değerlendirilen |
| `rating` | int | 1-5 |
| `comment` | text nullable | |

### Category (categories tablosu)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `name` | varchar unique | |
| `icon` | varchar(10) | emoji |
| `description` | text | |
| `group` | varchar(60) nullable | üst grup adı |
| `subServices` | simple-json | alt hizmet listesi |
| `avgPriceMin/Max` | integer nullable | |
| `isActive` | boolean default true | |
| `sortOrder` | int | sıralama |

**5 Grup, 29 Kategori (seed):**
- Ev & Yaşam: Temizlik, Boya & Badana, Bahçe & Peyzaj, Nakliyat, Mobilya Montaj, Haşere Kontrolü, Havuz & Spa, Çilingir & Kilit
- Yapı & Tesisat: Elektrikçi, Tesisat, Klima & Isıtma, Zemin & Parke, Çatı & Yalıtım, Marangoz & Ahşap, Cam & Doğrama, Alçıpan & Asma Tavan, Güvenlik Sistemleri
- Dijital & Teknik: Bilgisayar & IT, Grafik & Tasarım, Web & Yazılım, Fotoğraf & Video
- Etkinlik & Yaşam: Düğün & Organizasyon, Özel Ders & Eğitim, Sağlık & Güzellik, Evcil Hayvan
- Araç & Taşıt: Araç & Oto Bakım

### TokenTransaction (token_transactions tablosu)

- `type`: purchase / spend / refund
- `paymentMethod`: bank / crypto / system
- `status`: pending / completed / failed
- Teklif başına maliyet: **5 token** (`OFFER_TOKEN_COST = 5`)
- Kullanıcı başlangıç bakiyesi: **100 token**

### Notification (notifications tablosu)

Türler: `booking_request`, `booking_confirmed`, `booking_cancelled`, `booking_completed`, `new_offer`, `offer_accepted`, `offer_rejected`, `new_review`, `system`

---

## Backend API Endpointleri

### Auth (`/auth`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/auth/login` | — | Email + şifre girişi |
| POST | `/auth/register` | — | Yeni kullanıcı kaydı |
| POST | `/auth/admin/login` | — | Admin girişi (username: "admin") |

### Users (`/users`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/users/me` | JWT | Kendi profili |
| PATCH | `/users/me` | JWT | Profil güncelle |
| GET | `/users/workers` | — | Usta dizini (?category=&city=) |
| GET | `/users/:id/profile` | — | Public profil (stats + reviews + pastPhotos) |
| GET | `/users/me/offer-templates` | JWT | Ustanın teklif şablonları (Phase 51) |
| POST | `/users/me/offer-templates` | JWT | Şablon ekle |
| DELETE | `/users/me/offer-templates/:id` | JWT | Şablon sil |

### Jobs (`/jobs`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/jobs` | — | Tüm ilanlar (?category=&status=&limit=&customerId=) |
| GET | `/jobs/:id` | — | Tek ilan (customer bilgisi dahil) |
| POST | `/jobs` | JWT | İlan oluştur |
| PATCH | `/jobs/:id` | JWT | İlan güncelle (owner) |
| DELETE | `/jobs/:id` | JWT | İlan sil (owner) |
| GET | `/jobs/my-offers` | JWT | Kullanıcının verdiği teklifler |
| GET | `/jobs/notifications` | JWT | Teklif bildirimleri (DB'siz) |
| GET | `/jobs/:jobId/questions` | — | Herkese açık soru listesi (yanıtlar dahil) |
| POST | `/jobs/:jobId/questions` | JWT | Soru gönder (o ilana teklif vermiş olmalı) |
| POST | `/jobs/:jobId/questions/:questionId/replies` | JWT | Yanıt gönder (ilan sahibi veya soruyu soran) |

### Offers (`/jobs/:jobId/offers` ve `/offers`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/jobs/:jobId/offers` | JWT | İlandaki teklifler |
| POST | `/jobs/:jobId/offers` | JWT | Teklif ver (5 token keser) |
| PATCH | `/jobs/:jobId/offers/:id/accept` | JWT | Teklif kabul |
| PATCH | `/jobs/:jobId/offers/:id/reject` | JWT | Teklif red |
| PATCH | `/jobs/:jobId/offers/:id/counter` | JWT | Pazarlık teklifi |
| PATCH | `/jobs/:jobId/offers/:id/status` | JWT | Durum güncelle |
| GET | `/offers/my` | JWT | Ustanın kendi teklifleri |

### Service Requests (`/service-requests`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/service-requests` | — | Tüm ilanlar (?category=) |
| GET | `/service-requests/my` | JWT | Kendi ilanlarım |
| GET | `/service-requests/:id` | — | Tek ilan |
| POST | `/service-requests` | JWT | İlan oluştur |
| PATCH | `/service-requests/:id` | JWT | Güncelle (owner) |
| DELETE | `/service-requests/:id` | JWT | Sil (owner) |
| POST | `/service-requests/:id/apply` | JWT | İlana başvur |
| GET | `/service-requests/:id/applications` | JWT | Başvuruları gör |
| GET | `/service-requests/applications/my` | JWT | Kendi başvurularım |
| PATCH | `/service-requests/applications/:appId/status` | JWT | Başvuru kabul/red |

### Bookings (`/bookings`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/bookings` | JWT | Randevu oluştur |
| GET | `/bookings/my-as-customer` | JWT | Müşteri randevularım |
| GET | `/bookings/my-as-worker` | JWT | Usta randevularım |
| GET | `/bookings/:id` | JWT | Tek randevu |
| PATCH | `/bookings/:id/status` | JWT | Durum güncelle |

### Reviews (`/reviews`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/reviews` | JWT | Yorum yaz |
| GET | `/reviews/user/:id` | — | Kullanıcı yorumları |
| GET | `/reviews/job/:jobId` | — | İş yorumları |

### Categories (`/categories`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/categories` | — | Tüm aktif kategoriler |
| GET | `/categories/:id` | — | Tek kategori |
| POST | `/categories` | — | Oluştur |
| PATCH | `/categories/:id` | — | Güncelle |
| DELETE | `/categories/:id` | — | Sil |

### Tokens (`/tokens`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/tokens/balance` | JWT | Bakiye |
| GET | `/tokens/history` | JWT | İşlem geçmişi |
| POST | `/tokens/purchase` | JWT | Token satın al {amount, paymentMethod: bank/crypto} |

### Notifications (`/notifications`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/notifications` | JWT | Tüm bildirimler |
| GET | `/notifications/unread-count` | JWT | Okunmamış sayısı |
| PATCH | `/notifications/read-all` | JWT | Tümünü okundu |
| PATCH | `/notifications/:id/read` | JWT | Tek okundu |

### Uploads (`/uploads`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/uploads/job-photos` | JWT | İş fotoğrafları (max 3, 8MB, sharp resize 1024px) |
| POST | `/uploads/job-video` | JWT | İş videoları (max 5, 50MB, mp4/mov/avi/mpeg) |
| POST | `/uploads/identity-photo` | JWT | Kimlik fotoğrafı (10MB, 1200px) |
| POST | `/uploads/document` | JWT | Belge fotoğrafı (10MB, 1200px) |

Dosyalar `nestjs-backend/uploads/` klasörüne kaydedilir. `/uploads/*` static route ile sunulur.

### AI (`/ai`)
| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/ai/generate-description` | İlan açıklaması üret |
| POST | `/ai/chat` | Genel sohbet |
| POST | `/ai/summarize-reviews` | Yorumları özetle |

AI: **Tüm AI yüzeyi Gemini 2.5 Flash** (`gemini-2.5-flash`). Phase 281'de migrate edildi — Anthropic SDK kaldırıldı (`@anthropic-ai/sdk` package'tan uninstall).

> **Kural:** Yapgitsin app içinde Claude/Opus/Haiku kullanma. Tüm AI servisleri `GeminiClient` üzerinden geçer ([gemini.client.ts](nestjs-backend/src/modules/ai/gemini.client.ts)). Tek env: `GEMINI_API_KEY`. AbortController 30s timeout. Per-user throttle (Phase 259) korunuyor.
>
> **Migrate edilen 6 servis:** `ai.service` (chat/jobAssistant/pricingAdvisor/supportAgent/summarize/categoryDesc/jobDesc), `dispute-mediation`, `fraud-detection`, `semantic-search`, `recommendation`, `translate` — `pricing` zaten Gemini'ydi.
>
> **Müdür istisnası:** `D:/müdür/` orchestration (Müdür/Voldi agent koordinasyonu) **Opus 4.8** kullanır — Yapgitsin uygulamasının dışıdır, bu kuralı bağlamaz.

### Admin (`/admin`)
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/admin/stats` | {totalJobs, openJobs, completedJobs, totalUsers, totalWorkers, verifiedWorkers, totalServiceRequests, openServiceRequests, totalOffers, totalBookings, totalReviews} |
| GET | `/admin/jobs` | Son ilanlar (?limit=20) |
| PATCH | `/admin/jobs/:id/featured` | {featuredOrder: 1\|2\|3\|null} |
| GET | `/admin/users` | Tüm kullanıcılar |
| PATCH | `/admin/users/:id/verify` | {identityVerified: boolean} |
| GET | `/admin/service-requests` | Tüm hizmet ilanları |
| PATCH | `/admin/service-requests/:id/featured` | {featuredOrder} |
| GET | `/admin/categories` | Kategoriler |
| PATCH | `/admin/categories/:id` | Kategori güncelle |
| GET | `/admin/audit-log/stats` | `?days=N` (1-90, default 30) → {totalEntries, entriesPerDay[], topActions[], topAdmins[], topTargetTypes[]} (her liste max 10) |
| POST | `/admin/notifications/broadcast` | {title (1-100), message (1-500), segment: "all"\|"workers"\|"customers"\|"verified_workers"} → {sent, segment} |
| POST | `/admin/users/bulk-verify` | {userIds: string[], identityVerified: boolean} → {updated} (toplu kullanıcı doğrulama) |

### Health (`/health`)
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/health` | — | {status, db, uptime, version} — status page için (Phase 53) |
| GET | `/admin/audit-log/purge-preview` | `?olderThanDays=N` → {count, oldestDate, newestDate} (silinecek kayıt önizleme) |
| POST | `/admin/audit-log/purge` | {olderThanDays: N} → {deleted} (eski audit log kayıtlarını sil) |


---

## Auth & Güvenlik

- **JWT**: `AuthGuard('jwt')` — `JwtStrategy` `Authorization: Bearer <token>` başlığını doğrular
- **Admin**: `admin@yapgitsin.tr` email, `ADMIN_INITIAL_PASSWORD` env şifre — `onModuleInit`'te otomatik oluşur
- **Flutter**: JWT `SharedPreferences`'da `jwt_token` key'iyle saklanır
- **Admin Panel**: JWT `localStorage`'da `admin_token` key'iyle saklanır
- `passwordHash`: bcrypt (10 rounds)
- JWT `expiresIn`: user `30d`, admin `8h` — `ignoreExpiration: false`
- **Rate limiting**: ThrottlerModule — IP başına dakikada 60 istek (global guard)

---

## Token Sistemi

```
Kullanıcı kayıt → 100 token başlangıç bakiyesi
Teklif ver → 5 token kesilir (OFFER_TOKEN_COST)
Token satın al → /tokens/purchase {amount, paymentMethod: "bank"|"crypto"}
```

---

## Puan & İstatistik Sistemi

```
reputationScore = round(averageRating × 20) + (asCustomerSuccess + asWorkerSuccess) × 5

// İş tamamlanınca
JobsService._trackStatusChange(COMPLETED):
  → bumpStat(customerId, asCustomerSuccess)
  → bumpStat(workerId, asWorkerSuccess)  // accepted offer'ın sahibi
  → recalcReputation(customerId + workerId)

// Review eklenince
ReviewsService.create():
  → recalcRating(revieweeId, rating)  // averageRating + totalReviews günceller
```

---

## Real-Time Chat (WebSocket)

- Socket.io: `ChatGateway` — `@WebSocketGateway`
- Olaylar: `sendMessage` → `receiveMessage` (broadcast), `joinRoom`, `getHistory`
- **Mesajlar DB'ye kaydediliyor** — `ChatMessage` entity, `chat_messages` tablosu. `getHistory` event'i ile son 100 mesaj alınabilir
- Flutter: `socket_io_client ^2.0.3`, `ChatService` sınıfı
- `app.useWebSocketAdapter(new IoAdapter(app.getHttpServer()))` main.ts'de gerekli

---

## Dosya Yüklemeleri

- Multer `memoryStorage` + sharp işleme
- `uploads/jobs/` — iş fotoğrafları (1024px, quality 75) ve videoları (max 5, 50MB, işlenmeden kaydedilir)
- `uploads/identity/<sanitizedName>/kimlik.jpg` — kimlik (1200px, quality 80)
- `uploads/identity/<sanitizedName>/belge.jpg` — belge
- Fotoğraf formatları: JPEG, JPG, PNG, WEBP
- Video formatları: mp4, mov, avi, mpeg

---

## Ödeme

- **İyzipay sandbox** (payments.service.ts) — key'ler `IYZIPAY_API_KEY`, `IYZIPAY_SECRET_KEY`, `IYZIPAY_URI` env'den okunur
- Flutter: `iyzico_payment_screen.dart` (WebView ile form)
- Production için gerçek key gerekir

---

## Flutter Uygulama

### Bağımlılıklar (pubspec.yaml)
| Paket | Kullanım |
|-------|----------|
| `flutter_riverpod ^2.4.9` | State management |
| `go_router ^13.1.0` | Navigasyon |
| `dio ^5.4.0` | HTTP istemci |
| `shared_preferences ^2.2.2` | Token saklama |
| `socket_io_client ^2.0.3` | WebSocket chat |
| `image_picker ^1.1.2` | Fotoğraf & video seçme |
| `flutter_map ^7.0.2` | Harita |
| `flutter_animate ^4.2.0` | Animasyonlar |
| `shimmer ^3.0.0` | Yükleme efekti |
| `cached_network_image ^3.3.0` | Fotoğraf cache |
| `webview_flutter ^4.4.2` | İyzipay ödeme |

### Navigasyon (GoRouter)
```
/ → MainShell (tab kontrolü /?tab=0)
/login → LoginScreen
/register → RegisterScreen
/post-job → PostJobScreen
/tokens → TokenScreen
```

### MainShell Sekmeleri
| Index | Tab | Guard |
|-------|-----|-------|
| 0 | Keşfet (\_HomeTab) | — |
| 1 | Hizmet Al (ServiceRequestScreen) | — |
| 2 | İşlerim (MyJobsScreen) | giriş gerekli |
| 3 | Bildirimler (NotificationScreen) | giriş gerekli |
| 4 | Profil (ProfileScreen) | — |

### State Yönetimi (Riverpod)
| Provider | Tip | Açıklama |
|----------|-----|----------|
| `authStateProvider` | StateNotifier | AuthInitial/Loading/Authenticated/Unauthenticated/Error |
| `jobsProvider` | StateNotifier | İlanlar listesi + filterJobs() |
| `jobDetailProvider` | FutureProvider.family | Tek ilan detayı |
| `jobOffersProvider` | FutureProvider.family | İlandaki teklifler |
| `categoriesProvider` | FutureProvider | Tüm kategoriler |
| `serviceRequestRepositoryProvider` | Provider | SR repository |
| `serviceRequestsProvider` | (main_shell'de kullanılıyor) | Hizmet ilanları |
| `tokenBalanceProvider` | FutureProvider | Token bakiyesi |
| `myPublicProfileProvider` | FutureProvider.autoDispose | Profil ekranı |
| `chatServiceProvider` | Provider | Socket.io servisi |

### API Bağlantısı
```dart
// Android emülatör → http://10.0.2.2:3001
// Web/iOS → http://localhost:3001
// --dart-define=API_URL=https://xxx.ngrok-free.app ile override
ApiConstants.baseUrl
```

### Tema (AppColors)
```dart
primary:       #007DFE (mavi)
primaryDark:   #0056B3
primaryLight:  #E5F2FF
secondary:     #2D3E50 (koyu lacivert)
accent:        #FFA000 (turuncu)
background:    #F8F9FA
success:       #00C9A7
error:         #DE4437
```

---

## Admin Panel (Next.js 16)

### Yapı
```
admin-panel/src/
├── app/
│   ├── (admin)/              # Admin shell (sidebar + auth guard)
│   │   ├── layout.tsx        # Sidebar, auth kontrolü localStorage
│   │   ├── dashboard/        # Stats + son ilanlar
│   │   ├── jobs/             # İlanlar + featured yönetimi
│   │   ├── categories/       # Kategori CRUD
│   │   ├── providers/        # Usta doğrulama (verify + featured)
│   │   └── users/            # Kullanıcı listesi
│   └── login/                # Admin giriş
└── lib/api.ts                # Backend API istemci
```

### Auth Akışı
1. `POST /auth/admin/login` → `access_token` + `user`
2. `localStorage` → `admin_token`, `admin_user`
3. Her istekte `Authorization: Bearer <token>`
4. Sayfa geçişinde `localStorage.getItem('admin_token')` kontrol

### Öne Çıkan Sistem
- Jobs: `PATCH /admin/jobs/:id/featured { featuredOrder: 1|2|3|null }`
- ServiceRequests: `PATCH /admin/service-requests/:id/featured { featuredOrder }`
- Provider featured: `PATCH /admin/providers/:id/featured`

---

## Seed Veriler

### Seed Kullanıcılar (şifre: Test1234)
| Email | Rol |
|-------|-----|
| fatma@test.com | Müşteri |
| mehmet@test.com | Müşteri |
| hasan@test.com | Usta |
| zeynep@test.com | Usta |
| admin / admin | Admin (username / şifre) |

### v2 Test Kullanıcıları (şifre: Test1234)
| Email | Rol | Notlar |
|-------|-----|--------|
| ayse@v2.test | Müşteri | %100 başarı, 4.5★, rep:100 |
| can@v2.test | Müşteri | %50 başarı, 4.0★, rep:85 |
| neslihan@v2.test | Müşteri | açık ilan var |
| emre@v2.test | Usta | %67 başarı, 5.0★, rep:110 |
| selin@v2.test | Usta | %50 başarı, 4.0★, rep:85 |

```bash
# v2 seed'i çalıştır
node nestjs-backend/seed-v2.js
```

### Job Seed
`JobsService.onModuleInit()` — DB boşsa 3 örnek ilan ekler (Salon Badana, Musluk Tamiri, Ev Temizliği).

### Admin Seed
`AuthService.onModuleInit()` — `admin@yapgitsin.tr` yoksa `ADMIN_INITIAL_PASSWORD` ile oluşturur.

### Kategori Seed
`CategoriesService.onModuleInit()` — categories tablosu boşsa 29 kategori ekler.

---

## Bilinen Sorunlar / Eksikler

1. ~~**`/admin/providers` endpoint yok**~~ — ✅ **Düzeltildi** (`e0847cca`): `GET /admin/providers`, `PATCH /admin/providers/:id/verify`, `PATCH /admin/providers/:id/featured` eklendi. `ProvidersService` dolduruldu, `AdminModule`'e bağlandı.

2. ~~**Chat mesajları kalıcı değil**~~ — ✅ **Düzeltildi** (`e0847cca`): `ChatMessage` entity oluşturuldu (`chat_messages` tablosu). `handleMessage` artık DB'ye kaydediyor. `getHistory` event'i ile son 100 mesaj çekilebilir.

3. ~~**Admin panel guard zayıf**~~ — ✅ **Düzeltildi** (`5dcbf701`): JWT payload decode edilerek `exp` alanı kontrol ediliyor; süresi dolmuş token'lar login'e yönlendiriyor.

4. ~~**JWT expiresIn eksik**~~ — ✅ **Düzeltildi** (`97d2f797`): User token'ları `30d`, admin token'ları `8h`. `jwt.strategy.ts`'de `ignoreExpiration: false` ve hardcoded fallback kaldırıldı (`292fc2c5`).

5. ~~**İyzipay sandbox key'leri hardcoded**~~ — ✅ **Düzeltildi** (`9f71fee6`): `IYZIPAY_API_KEY`, `IYZIPAY_SECRET_KEY`, `IYZIPAY_URI` env değişkenlerine taşındı.

6. ~~**Providers sayfası çalışmıyor**~~ — ✅ **Düzeltildi** (`e0847cca`): Backend endpoint'leri eklendi, admin panel `/providers` sayfası artık çalışıyor.

---

## vNext Admin Refactor (Phase 269-274)

Mayıs 2026 — APK Tasarım+İçerik admin control + Live Builder + Backup/Restore + Performance pass.

### Phase Özeti

- **Phase 269 — APK Tasarım+İçerik admin control:** 5 entity (settings/theme/branding/layout/visibility) + 9 admin endpoint + 2 admin sayfa (`/apk-tasarim`, `/apk-icerik`) + APK Preview modal + Flutter `AppConfigService` (cache + fallback). TypeORM + SQLite.
- **Phase 270 — Full brief:** Live Builder (drag&drop section order), AI Assistant (Claude prompt → config diff), Cmd+K palette, Realtime Analytics (online users/sessions), Rollback/Version History (her save audit + restore), i18n (TR/EN), Export (CSV/JSON), Animated background.
- **Phase 271 — Açık item'lar:** jsPDF PDF export, @dnd-kit drag-drop, branding asset upload (multer+sharp), WS push (`app-config:updated` event → Flutter auto-refresh).
- **Phase 272 — Profile Card + Backup Manager:** Profile Card admin UI (10 toggle + label override + live preview) + Backup Manager (DB snapshot create/list/download/delete + audit log) + iisnode-cwd-safe DB path resolver.
- **Phase 273 — Restore + cron + 3D rotate:** Backup restore (YYYYMMDD token gate + pre-restore snapshot + audit), daily cron (24h, retention 7), interactive 3D phone rotate (`PhoneFrame3D` mouse/touch drag ±25°). 273b: IIS `.sqlite` URL block fix — filename → query/body.
- **Phase 274 — M7 Performance:** Admin bundle audit, query indexes, image optimization, WS efficiency. In-progress.

### Yeni Endpoint'ler

| Endpoint | Method | Açıklama |
|---|---|---|
| `/app-config` | GET | Public — Flutter cache çeker |
| `/admin/app-config/settings` | GET/PATCH | Genel ayarlar |
| `/admin/app-config/theme` | GET/PATCH | Renk paleti + dark/light |
| `/admin/app-config/branding` | GET/PATCH | Logo/splash/varlık URL'leri |
| `/admin/app-config/layout` | GET/PATCH | Section sırası (drag&drop) |
| `/admin/app-config/visibility` | GET/PATCH | Profile card 10 toggle + label override |
| `/admin/app-config/history` | GET | Tüm config save geçmişi (audit) |
| `/admin/app-config/rollback` | POST | Version'a geri al |
| `/admin/escrow/settings` | GET/PATCH | Phase 267 escrow toggles (QR hide, GPS relax, grace) |
| `/admin/realtime/online` | GET | Anlık online kullanıcı sayısı |
| `/admin/realtime/sessions` | GET | Aktif session listesi |
| `/admin/backup/list` | GET | Snapshot listesi |
| `/admin/backup/create` | POST | Manuel snapshot |
| `/admin/backup/restore` | POST | `{filename, token: YYYYMMDD}` — pre-restore snapshot + audit |
| `/admin/backup/download?filename=` | GET | Snapshot indir (IIS `.sqlite` block → query param) |
| `/admin/backup?filename=` | DELETE | Snapshot sil |
| `/uploads/branding?kind=` | POST | Logo/splash/icon upload (multer+sharp resize) |
| `/app-config` (WS) | namespace | Event: `app-config:updated` → Flutter auto-refresh |

### Yeni Admin Sayfaları

- `/apk-tasarim` — Tema + branding + animated bg + live preview
- `/apk-icerik` — Section visibility + label override + i18n
- `/apk-builder` — Live drag&drop builder + AI assistant + Cmd+K + export
- `/backup` — Snapshot manager (create/list/download/restore/delete)
- `/profile-card` — 10 toggle + label override + live phone preview
- `/escrow-settings` — Phase 267 escrow tuning UI
- `/realtime-analytics` — Online users + active sessions + WS events

---

## Oturum Özeti (Mayıs 2026)

### Yeni Özellikler
- **Public Q&A / Questions sekmesi** (`a0394c98`): Airtasker tarzı herkese açık soru-cevap. `JobDetailScreen`'e Offers|Questions tab bar eklendi. Soru sormak için o ilana teklif verilmiş olması gerekir (Karar B). `job_questions` + `job_question_replies` tabloları. Flutter `JobQuestionsTab` widget'ı
- **Video desteği** (`68afc4c2`): `POST /uploads/job-video` (max 5, 50MB). `Job` entity'e `videos` alanı. Flutter `PostJobScreen`'e `JobVideoPicker` widget'ı eklendi
- **Swagger/OpenAPI** (`68afc4c2`): `/api/docs` adresinde Swagger UI. Tüm modüller etiketli, JWT Bearer auth destekli
- **Rate limiting** (`68afc4c2`): ThrottlerModule — IP başına dakikada 60 istek (global guard)
- **Admin stats genişletildi** (`68afc4c2`): 4 → 11 istatistik. Yeni: `openJobs`, `completedJobs`, `totalWorkers`, `verifiedWorkers`, `totalOffers`, `totalBookings`, `totalReviews`
- **ServiceRequest harita koordinatı** (`68afc4c2`): `latitude`/`longitude` entity'e eklendi. Flutter `PostServiceRequestScreen` harita picker'a bağlandı
- **Harita entegrasyonu** (`68a8858a`): Yakındaki işler endpoint'i, GPS, pin, mini kart, 5 sekme nav
- **Yapgitsin sekmesi** (`af4faef1`): İlanlar + fırsatlar + işlerim tek ekranda
- **Teslim tarihi (dueDate)** (`0f9aa3f5`): Airtasker stili tarih seçici `PostJobScreen`'e ilk seçenek olarak eklendi. "Esnek" seçeneği ile tarih silinebilir. `Job` entity + DTO güncellendi. `JobDetailScreen` başlık alanında gösteriliyor
- **Grafik UI overhaul** (`8e27fa92`): Chat ekranları (mesaj balonları, AppBar avatar, online göstergesi), nav ikonları (rounded), iş kartları yeniden tasarlandı, kategori şeritleri eklendi
- **Airtasker ilan sahibi profil kartı** (`608c3622`): `JobDetailScreen` müşteri kartı tamamen yeniden tasarlandı — büyük avatar + doğrulama rozeti, 3 istatistik chip (yıldız, iş sayısı, tamamlama oranı), "Profili Gör" butonu. `jobs.service.ts`'den `identityVerified`, `asCustomerTotal`, `asCustomerSuccess` alanları eklendi
- **PublicProfileScreen** (`608c3622`): `/profile/:id` route'u. Hero header (gradient + avatar + verified rozet), stats satırı, kategori chip'leri, geçmiş iş fotoğrafları, yorumlar listesi
- **Phase 33 — Audit Log Analytics** (backend `c5c5727f`, frontend `260b25f8`): `GET /admin/audit-log/stats?days=N` (1-90, default 30) → `{ totalEntries, entriesPerDay[], topActions[], topAdmins[], topTargetTypes[] }` (her liste max 10). Admin panel audit-log sayfasında stats card: 7/30/90 gün picker, 4 KPI, top-5 listeleri, daily bar sparkline
- **Phase 34 — Admin Broadcast Notifications** (`0cd52b8c`): `POST /admin/notifications/broadcast` `{ title (1-100), message (1-500), segment: "all"|"workers"|"customers"|"verified_workers" }` → `{ sent, segment }`. Tüm hedef kullanıcılara `type:'system'` Notification insert (chunked 500'lük bulk save). Audit log: `notification.broadcast` action. Flutter `system` ikonu (`Icons.campaign`, `12a3d55a`); admin panel `/broadcast` sayfası (`6c1bc18c`)
- **Phase 35 — Bulk User Verify** (BE `6b4e5cbf`, UI `4d291ab8`): `POST /admin/users/bulk-verify` `{ userIds, identityVerified }` → `{ updated }`. Admin panel users sayfasında checkbox seçim + toolbar (toplu onay/iptal)
- **Phase 36 — Audit Log Retention** (BE `65dcbc99`, UI `70ee7812`): `GET /admin/audit-log/purge-preview?olderThanDays=N` ve `POST /admin/audit-log/purge` `{ olderThanDays }`. Audit log sayfasında purge modal — önizleme + onaylı silme
- **Phase 50 — Job Draft Autosave** (Flutter `a14d33ff`): `PostJobScreen` form alanları SharedPreferences'a otomatik kaydediliyor; ekrana dönüldüğünde taslak geri yükleniyor, submit sonrası temizleniyor
- **Phase 51 — Worker Offer Templates** (BE `5721bf1f`, FE `6f5b61b9`): `GET/POST/DELETE /users/me/offer-templates`. Ustalar sık kullandıkları teklif metinlerini şablon olarak kaydedip teklif formunda hızlıca uygulayabiliyor
- **Phase 52 — Job Photo Lightbox + Share** (Flutter `da0d2c4a`): `JobDetailScreen` fotoğraflarına tap → tam ekran lightbox (pinch-zoom, swipe). Paylaş butonu ile ilan linki sistem share sheet'e gönderiliyor
- **Phase 53 — Health Check + Status Page** (BE `95e8c20e`, Admin `2d1bc4ee`): `GET /health` → `{status, db, uptime, version}`. Admin panel `/status` sayfası canlı sağlık göstergesi (DB bağlantısı, uptime, sürüm)
- **Phase 54 — Worker Badges** (BE `26fb24e7`, FE pending): Otomatik rozet sistemi — `topRated`, `verified`, `experienced`, `responsive`. Public profile API rozetleri döndürüyor; Flutter UI henüz eklenmedi

### Güvenlik
- **JWT expiresIn** (`97d2f797`): User `30d`, admin `8h`. `ignoreExpiration: false`
- **JWT hardcoded secret** (`292fc2c5`): Fallback kaldırıldı; `JWT_SECRET` env yoksa uygulama başlamıyor
- **İyzipay key'leri** (`9f71fee6`): `IYZIPAY_API_KEY`, `IYZIPAY_SECRET_KEY`, `IYZIPAY_URI` env'e taşındı
- **Admin panel guard** (`5dcbf701`): JWT `exp` alanı decode edilerek süresi dolmuş token'lar login'e yönlendiriliyor

### Performans
- **`getWorkers()`** (`9b83d139`): JS filtreleme → DB-level `WHERE + ORDER BY reputationScore DESC`
- **Pagination** (`ea2d4bbc` + `63c6f5b3`): `/jobs`, `/bookings/*`, `/offers/my` → `{ data, total, page, limit, pages }`
- **`getPublicProfile()` N+1** (`983fe713`): Sıralı sorgular → `Promise.all`

### Açık Sorunların Kapatılması
- **`/admin/providers` endpoint** (`e0847cca`): `GET`, `PATCH verify`, `PATCH featured` eklendi
- **Chat kalıcılığı** (`e0847cca`): `ChatMessage` entity, `getHistory` event'i
- **Post-job success butonu** (`9a34f5ef`): `SuccessScreen` `StatelessWidget` → `ConsumerWidget`. `Navigator.pushReplacement` → GoRouter `/job-success` route. Buton artık kendi context'inden `context.go('/')` çağırıyor

### Git Temizliği
- `nestjs-backend/dist/`, `hizmet_db.sqlite`, `.claude/`, `CLAUDE.md` gitignore'a eklendi

### Ortam Değişkenleri (`.env`'e eklenenler)
```
IYZIPAY_API_KEY=sandbox-...
IYZIPAY_SECRET_KEY=sandbox-...
IYZIPAY_URI=https://sandbox-api.iyzipay.com
```

---

## Commit Geçmişi

| Hash | Açıklama |
|------|----------|
| `26fb24e7` | feat(phase-54): worker badges — auto-computed badges in public profile |
| `2d1bc4ee` | feat(phase-53): admin status page — live health check display |
| `95e8c20e` | feat(phase-53): GET /health endpoint — db, uptime, version |
| `da0d2c4a` | feat(phase-52): job photo lightbox + share — full-screen viewer + share sheet |
| `6f5b61b9` | feat(phase-51): offer templates UI — quick-apply in offer form |
| `5721bf1f` | feat(phase-51): worker offer templates — GET/POST/DELETE /users/me/offer-templates |
| `a14d33ff` | feat(phase-50): job draft autosave — SharedPreferences persistence |
| `70ee7812` | feat(phase-36): audit log retention — purge modal UI |
| `65dcbc99` | feat(phase-36): audit log retention — purge-preview + purge endpoints |
| `6b4e5cbf` | feat(phase-35): bulk user verify — POST /admin/users/bulk-verify |
| `4d291ab8` | feat(phase-35): bulk user verify — users page checkbox + toolbar |
| `6c1bc18c` | feat(phase-34): admin broadcast UI — /broadcast page |
| `12a3d55a` | feat(phase-34): Flutter system notification icon (Icons.campaign) |
| `0cd52b8c` | feat(phase-34): admin broadcast notifications — segmented bulk insert with audit log |
| `260b25f8` | feat(phase-33): audit log analytics UI — stats card with KPIs, top lists, daily sparkline |
| `c5c5727f` | feat(phase-33): audit log analytics endpoint — GET /admin/audit-log/stats?days=N |
| `9a34f5ef` | fix: post-job success screen — use GoRouter context for navigation |
| `608c3622` | feat: Airtasker-style poster profile card + PublicProfileScreen |
| `8e27fa92` | feat: grafik UI overhaul — chat bubbles, nav icons, job cards, category strips |
| `0f9aa3f5` | feat: teslim tarihi (dueDate) — Airtasker style date picker in PostJobScreen |
| `a0394c98` | feat: public Q&A (Questions tab) — Airtasker tarzı soru-cevap sistemi |
| `68afc4c2` | feat: video support, Swagger docs, rate limiting, expanded admin stats, SR map picker |
| `bdfac836` | fix: resolve TypeScript errors — positional params for Haversine, paginated findByUser return type |
| `68a8858a` | feat: map integration — nearby jobs endpoint, GPS, drop pins, mini card, 5-tab nav |
| `af4faef1` | feat: Yapgitsin sekmesi — ilanları, fırsatları ve işlerimi tek ekranda topla |
| `e0847cca` | fix: resolve all remaining known issues — providers endpoint, chat persistence |
| `983fe713` | perf: parallelize getPublicProfile queries and push offer filter to DB |
| `63c6f5b3` | fix: update Flutter repositories and offers controller to handle paginated responses |
| `ea2d4bbc` | perf: add page/limit pagination to jobs, bookings and offers endpoints |
| `9b83d139` | perf: push getWorkers filtering to DB instead of in-memory scan |
| `5dcbf701` | fix: validate JWT expiry in admin panel guard instead of token existence check |
| `9f71fee6` | fix: move iyzipay keys from hardcoded to environment variables |
| `292fc2c5` | fix: remove hardcoded JWT secret fallback and enforce expiration |
| `97d2f797` | fix: add 30d expiry to user JWT tokens (login and register) |
| `aed8e57c` | fix: resolve all TypeScript compiler errors and Flutter deprecations |
| `eb1974e0` | fix: resolve all ESLint TypeScript errors in NestJS backend (690 → 0) |
| `c6b4918d` | feat: initial commit |

---

## Agent Team Configuration (Müdür + 6 Voldi)

> **Kanonik kaynak:** `D:/müdür/MUDUR_PROMPT.md` (v2.1) — tüm protokol detayları, §12-17 checkpoint/shared context/conditional pipeline/trace/retry/conflict kuralları orada.
> **Yapgitsin state:** `D:/müdür/projects/yapgitsin.md`.
> Aşağıdaki bölüm Yapgitsin'e özel hızlı referanstır; çatışma olursa MUDUR_PROMPT.md kazanır.

### Team Structure

```
Müdür (Orchestrator)
├── Voldi-design   — UI/design tokens, component patterns, visual polish
├── Voldi-fs       — Frontend (Next.js/React), backend (NestJS), API integration
├── Voldi-db       — Database schema, queries, performance optimization
├── Voldi-ops      — Deployment, infrastructure, CI/CD, performance monitoring
├── Voldi-sec      — Security audits, auth, XSS/injection prevention, compliance
└── Voldi-ai       — AI features, prompt engineering, LLM integration (Claude SDK)
```

### Skill Routing Rules

Invoke appropriate agent when:

| Task Type | Primary Agent | Secondary | Trigger |
|-----------|---------------|-----------|---------|
| **Design System** | Voldi-design | — | `DESIGN_TOKENS.md`, component library, Airtasker pattern, theme colors |
| **UI Components** | Voldi-fs | Voldi-design | React/TSX changes, component props, CSS/Tailwind |
| **API Endpoints** | Voldi-fs | Voldi-db | NestJS controllers, DTOs, guards, middleware |
| **Database** | Voldi-db | Voldi-fs | Schema, migrations, queries, performance (n+1, indexes) |
| **Deployment** | Voldi-ops | Voldi-fs | FTP, static export, build output, performance metrics |
| **Security** | Voldi-sec | Voldi-fs | JWT, XSS, CORS, env secrets, rate limiting, compliance |
| **AI Features** | Voldi-ai | Voldi-fs | Claude SDK, prompts, batch processing, caching |
| **Performance** | Voldi-db | Voldi-ops | Query optimization, caching, bundle size, Core Web Vitals |

### Dispatch Workflow (markdown-based, not code)

Müdür ≠ Node.js CLI. Müdür = markdown protokol. Claude Code `MUDUR_PROMPT.md`'yi okur ve `Agent` tool ile Voldi subagent'larını dispatch eder.

9-adımlı protokol (`D:/müdür/MUDUR_PROMPT.md` §3 detay):

| # | Aktör | Çıktı |
|---|---|---|
| 1 | User | Ham talimat |
| 2 | Müdür | Resepsiyon + ön analiz |
| 3 | Çakma + Voldi | Dispatch planı |
| 4 | Voldi(ler) | İcra (kod) |
| 5 | Çakma + Voldi | Denetim (build/test/smoke) |
| 6 | Çakma | Dispatch raporu → Müdür |
| 7 | Müdür | Doc güncelle + build |
| 8 | Müdür | Deploy onayı |
| 9 | Çakma | Deploy + final rapor → User |

**Çakma Müdür** = deploy-only persona (`D:/müdür/cakma_mudur/`). Kod yazmaz; sadece build artefakt + FTP/Firebase + smoke + `last_deploy.md` raporu.

### Phase Protokol Eklemeler (MUDUR_PROMPT v2.1 §12-17)

Yapgitsin'e uygulanan ek kurallar (`D:/müdür/MUDUR_PROMPT.md`'den):

| § | Kural |
|---|---|
| 12 | **Phase Checkpoint** — `D:/müdür/projects/yapgitsin.md` içinde `## CURRENT_PHASE` bloğu (id/started_at/completed_steps/pending_steps/status). "Kaldığın yerden devam" net. |
| 13 | **Shared Context** — `D:/müdür/projects/yapgitsin.shared.md` Voldi'lerin birbirinin çıktısını okuduğu cross-context dosyası. Dispatch öncesi zorunlu okuma. |
| 14 | **Conditional Pipeline** — Voldi-sec `BLOCKED` → pipeline durdur. Voldi-db pending migration → fs/design dispatch ertele. Default: 6 paralel + sec gate. |
| 15 | **Observability** — `D:/müdür/dispatch_trace.jsonl` her dispatch için 1 satır JSONL (ts/phase/voldi/duration/status/files_changed/summary). |
| 16 | **Retry/Bail-out** — Transient: 1 retry. Permanent: 1 retry düzeltilmiş prompt. Logical (sec BLOCKED): retry yok. Max 2 deneme → kullanıcıya yükselt. |
| 17 | **Conflict Resolution** — Mevcut kod patern'i > CLAUDE.md kuralı > sec gate > kullanıcıya 2-3 seçenek. Müdür kendi başına mimari değiştirmez. |

### Autonomous Mode

- ✅ Auto-commit + push ("push edeyim mi?" sormaz)
- ✅ Paralel Voldi dispatch (bağımsız subtask'lar TEK message)
- ✅ Phase chaining (blokaj yoksa otomatik zincirleme)
- ✅ Sessiz hata raporu → final konsolide rapor

### Phase Template

`D:/müdür/projects/yapgitsin.md` CURRENT_PHASE bloğu (canonical):

```markdown
## CURRENT_PHASE
- id: 391
- title: "Phase başlığı"
- voldi: design, fs       # hangi Voldi'ler
- completed_steps: [...]
- pending_steps: [...]
- last_commit: <hash>
- status: in_progress | blocked | done
```

---

## Voldi Agent Role Definitions

> Detay: her Voldi'nin lessons-learned'i `D:/müdür/0X_*.md`'de. Aşağıdaki tablo
> Yapgitsin'e özel hızlı referans.

### **Voldi-design** ([D:/müdür/08_design.md](D:/müdür/08_design.md))
- **Yetki:** UI/UX overhaul, design tokens, mobile-first, motion craft
- **Yapgitsin palette:**
  - **Flutter app** (Phase 221 "Premium Dark Soft"): primary `#4ADE80` (yeşil), surface `#161B22`, bg `#0C1117` — tema-aware getter (`AppColors.*`)
  - **Admin panel + Web** (Airtasker-inspired): primary `#FF5A1F` coral, secondary `#2D3E50` navy
- **Standartlar:** Phase 388 3D pattern (`card3d()` + drag handle 44×4 + sheet köşe 22), Emil Kowalski 7 great-anim prensibi (Phase 391 motion.dart)
- **Key files:** `hizmet_app/lib/core/theme/app_colors.dart`, `card_3d.dart`, `motion.dart`, admin-panel `globals.css`
- **Review Gate:** Flutter — "AppColors getter mi (tema-aware)? Phase 388 3D pattern uyumlu?" / Admin — "Airtasker palette + 16-24px radius?"

### **Voldi-fs** ([D:/müdür/05_fs.md](D:/müdür/05_fs.md))
- **Yetki:** NestJS + Next.js admin + Next.js web + Flutter — feature, refactor, API
- **Yapgitsin stack:**
  - **Backend:** NestJS 10, TypeORM, SQLite dev+prod, Socket.io, multer+sharp, Swagger
  - **Admin:** Next.js 16 App Router, Tailwind, localStorage JWT
  - **Web:** Next.js 16 static export, i18n (tr/en/az)
  - **App:** Flutter 3.x, Riverpod, GoRouter, Dio, socket_io_client, flutter_map (OSM)
- **Pattern:** DTO + class-validator, `AuthGuard('jwt')` + `@CurrentUser()`, `simple-json/simple-enum` SQLite uyumlu, pagination `{data,total,page,limit,pages}`, Flutter `ApiConstants.baseUrl` env override
- **Review Gate:** "DTO validated? Auth guard doğru? Pagination response? SQLite tipi `simple-json/datetime/float`?"

### **Voldi-db** ([D:/müdür/06_db.md](D:/müdür/06_db.md))
- **Yetki:** SQLite/TypeORM, query opt, indexing, migration, backup/rollback
- **Yapgitsin DB:** SQLite (prod + dev); `synchronize: true` dev, `false` prod + `migrationsRun: true` boot migration
- **Migration:** `scripts/migrations/NNN_description.sql`, idempotent (`IF NOT EXISTS`), `_migrations` tracking table
- **28 tablo:** users, jobs, job_questions, job_question_replies, offers, service_requests, service_request_applications, bookings, reviews, categories, token_transactions, notifications, chat_messages, audit_log, ...
- **Açık ihtiyaçlar:** Redis cache (kategori×şehir matrix), search index (Meilisearch/Typesense), read replica
- **SQLite tip kuralları:** `datetime` NOT `timestamp`, `float` NOT `decimal`, `simple-json` NOT `jsonb` → boot crash önler
- **Review Gate:** "Index var mı? n+1 yok mu? Migration idempotent?"

### **Voldi-ops** ([D:/müdür/03_ops.md](D:/müdür/03_ops.md))
- **Yetki:** Local infra, Docker/K8s, log debug, network, Nginx/IIS/Plesk
- **Yapgitsin deploy:**
  - **Host:** Plesk Windows + IIS, yapgitsin.tr
  - **Backend:** NestJS standalone `D:\backend`, iisnode `dist/main.js`
  - **Admin:** Next.js standalone `D:\admin`, iisnode `server.js`
  - **Web:** Next.js static `D:\web`, IIS direct
  - **App:** Flutter web `D:\app`, IIS direct, base `/app/`
- **Deploy script:** `node scripts/node-ftp-deploy.js` (basic-ftp tabanlı, PowerShell sorunlarından izole)
- **Sık sorunlar:** Port 3001 EADDRINUSE zombie, web.config'de `node_modules/iisnode/.env` hidden segment, `iisnode-cwd-safe` DB resolver
- **Backup:** Phase 273 — günlük SQLite snapshot cron + 7 gün retention + token-gate restore (`YYYYMMDD`)
- **Review Gate:** "Build reproducible? Smoke geçiyor mu? Deploy `last_deploy.md`'ye yazılıyor mu?"

### **Voldi-sec** ([D:/müdür/04_sec.md](D:/müdür/04_sec.md))
- **Yetki:** JWT/Auth, OWASP, rate limit, hardening, pen test, log monitoring
- **Yapgitsin kuralları:**
  - JWT user 30d, admin 8h, `ignoreExpiration: false`, secret env'den (hardcoded fallback YOK)
  - bcrypt 10 rounds
  - Helmet ^8.1.0 + HSTS 180g
  - Rate limit: ThrottlerModule global guard 60/dk/IP
  - CORS: `ALLOWED_ORIGINS` env, production https zorunlu
- **Açık riskler:** CORS HTTP downgrade temizliği, NODE_ENV production garanti, CSP header, Iyzipay callback https
- **Review Gate:** "Credentials exposed? Rate limit yeterli? CORS prod'da https only?" — **§14 sec gate: BLOCKED dönerse pipeline durur**

### **Voldi-ai** ([D:/müdür/07_ai.md](D:/müdür/07_ai.md))
- **Yetki:** LLM entegrasyon, prompt eng, RAG, embedding, MCP, agent orchestration
- **Yapgitsin AI (Phase 281 migration):**
  - **Tüm `/ai/*` endpoint'leri Gemini 2.5 Flash** (`GeminiClient`, env: `GEMINI_API_KEY`)
  - `@anthropic-ai/sdk` package'tan kaldırıldı
  - Endpointler: `POST /ai/generate-description`, `/ai/chat`, `/ai/summarize-reviews`
- **Anthropic (Opus 4.8) — sadece bu orchestration katmanı için** (`D:/müdür/`), Yapgitsin uygulaması içinde YOK
- **Prompt kuralları:** Phase 382 — 40-60 kelime hedef, 2-3 cümle, pazarlama dili yasak (sadece "usta" türevleri için)
- **Key files:** `nestjs-backend/src/modules/ai/gemini.client.ts`, `ai.service.ts`
- **Review Gate:** "Prompt yeterince kısa? maxOutputTokens makul (256/yazı)? Gemini'ye gidiyor mu (Anthropic değil)?"
