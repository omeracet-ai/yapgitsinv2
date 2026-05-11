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
ANTHROPIC_API_KEY=<claude için gerekli, ai özellikler için>
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

AI: **claude-opus-4-7** model, adaptive thinking, prompt caching (`cache_control: ephemeral`).
`ANTHROPIC_API_KEY` .env'de gerekli.

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

### Dispatch Workflow

1. **User requests phase (e.g., "Phase 159 başla")**
2. **Müdür creates phase spec** → `D:\müdür\NNN_phase_*.md`
3. **Müdür dispatches 6 agents in parallel:**
   ```
   node src/cli.ts "Phase NNN: Description — 6 Voldi: design/fs/db/ops/sec/ai"
   ```
4. **Each agent:**
   - Reads phase spec
   - Works on assigned task
   - Reports findings/code
5. **Müdür collects all reports** → single commit + push
6. **Output:** GitHub PR or commit message with all agent contributions

### Phase Template

Create `D:\müdür\NNN_phase_*.md` with:
- **Goal:** What's the business outcome?
- **Scope:** Which subsystems affected?
- **Voldi-design tasks:** Design changes, tokens, component specs
- **Voldi-fs tasks:** React/NestJS code, API changes, form logic
- **Voldi-db tasks:** Schema, migrations, queries, performance checks
- **Voldi-ops tasks:** Build, deploy, monitoring, performance
- **Voldi-sec tasks:** Security audit, auth flow, data validation
- **Voldi-ai tasks:** AI prompts, Claude integration, content generation
- **Success criteria:** Measurable deliverables
- **Timeline:** Estimated hours per agent

### Autonomous Mode

Müdür operates with:
- ✅ Auto-commit + push (no "push edeyim mi?" prompts)
- ✅ Parallel agent dispatch (all 6 at once)
- ✅ Silent failures reported → single digest report
- ✅ Phase chaining (Phase 158 → 159 → 160 automatically if no blockers)

### Offline Mode (No Ollama)

If Müdür offline, Claude Code assistant manually implements phases:
1. Creates phase spec
2. Implements work following Voldi role guidelines
3. Commits & pushes
4. Waits for FTP/deployment user input

---

## Voldi Agent Role Definitions

### **Voldi-design**
- **Responsibility:** Visual & UX coherence
- **Expertise:** Design tokens, Tailwind, Airtasker pattern, typography, spacing, shadows, colors
- **Outputs:** Design spec updates, component guidelines, CSS changes
- **Key Files:** `DESIGN_TOKENS.md`, `globals.css`, component documentation
- **Review Gate:** "Does this follow Airtasker palette (#FF5A1F, #2D3E50, #FFB400)?"

### **Voldi-fs**
- **Responsibility:** Code quality, API contracts, React patterns, NestJS structure
- **Expertise:** Next.js App Router, React hooks, NestJS services, REST API design, TypeScript
- **Outputs:** React/NestJS code, refactored components, API endpoints, unit tests
- **Key Files:** `web/src/app/**/*.tsx`, `nestjs-backend/src/**/*.ts`
- **Review Gate:** "Is this code clean, typed, and testable? Does it follow project patterns?"

### **Voldi-db**
- **Responsibility:** Data integrity, query performance, schema evolution
- **Expertise:** SQLite/TypeORM, query optimization, migration planning, indexes, n+1 prevention
- **Outputs:** Entity updates, migration scripts, query refactors, performance reports
- **Key Files:** `nestjs-backend/src/entities/*.ts`, queries in services
- **Review Gate:** "Will this scale? Are there missing indexes? Any n+1 queries?"

### **Voldi-ops**
- **Responsibility:** Build health, deployment readiness, production stability
- **Expertise:** Next.js static export, Plesk FTP, performance monitoring, CI/CD
- **Outputs:** Deploy checklist, performance metrics, monitoring scripts, infra docs
- **Key Files:** `next.config.ts`, build output verification, deployment procedures
- **Review Gate:** "Is the build reproducible? Can we deploy this safely?"

### **Voldi-sec**
- **Responsibility:** Security posture, compliance, threat prevention
- **Expertise:** JWT/auth, XSS/injection prevention, CORS, rate limiting, env secrets, GDPR
- **Outputs:** Security audit reports, vulnerable code fixes, security tests
- **Key Files:** NestJS guards, middleware, validation pipes, sanitization
- **Review Gate:** "Could an attacker exploit this? Are credentials exposed?"

### **Voldi-ai**
- **Responsibility:** AI/LLM features, prompt quality, Claude SDK integration
- **Expertise:** Claude API, prompt engineering, batch processing, caching, streaming
- **Outputs:** AI feature specs, prompt examples, integration code, performance tuning
- **Key Files:** `nestjs-backend/src/ai/`, prompt templates, Claude SDK calls
- **Review Gate:** "Is the prompt clear? Will Claude output useful? Is caching optimal?"
