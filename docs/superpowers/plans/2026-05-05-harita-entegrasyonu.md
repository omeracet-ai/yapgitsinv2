# Harita Entegrasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usta odaklı Airtasker modeli harita ekranı — yakındaki iş ilanları turuncu damla pinlerle, GPS konumu, mini kart + Teklif Ver.

**Architecture:** Backend'e `latitude/longitude` alanları eklenir (User + Job entity); Haversine sorgulu `/jobs/nearby` endpoint; Flutter'da ayrı bir `map` feature modülü (`map_repository` → `map_provider` → `map_screen`); `main_shell.dart`'a 5. sekme olarak eklenir.

**Tech Stack:** NestJS + TypeORM + SQLite (Haversine raw SQL), Flutter `flutter_map ^7.0.2` (zaten mevcut), `geolocator ^13.0.0` (eklenecek), Riverpod StateNotifier.

---

## File Map

### Oluşturulacak
- `hizmet_app/lib/features/map/data/map_repository.dart` — `getNearbyJobs()`, `updateLocation()` API çağrıları
- `hizmet_app/lib/features/map/presentation/providers/map_provider.dart` — `MapState` + `MapNotifier`
- `hizmet_app/lib/features/map/presentation/screens/map_screen.dart` — Ana harita ekranı

### Değiştirilecek
- `nestjs-backend/src/modules/users/user.entity.ts` — `latitude`, `longitude`, `lastLocationAt` ekle
- `nestjs-backend/src/modules/users/users.service.ts` — `updateLocation()` metodu ekle
- `nestjs-backend/src/modules/users/users.controller.ts` — `PATCH /users/me/location` endpoint
- `nestjs-backend/src/modules/jobs/job.entity.ts` — `latitude`, `longitude` ekle
- `nestjs-backend/src/modules/jobs/jobs.service.ts` — `findNearby()` metodu (Haversine)
- `nestjs-backend/src/modules/jobs/jobs.controller.ts` — `GET /jobs/nearby` endpoint
- `hizmet_app/pubspec.yaml` — `geolocator: ^13.0.0` ekle
- `hizmet_app/lib/features/home/presentation/screens/main_shell.dart` — 5. sekme (Harita, index 2)

---

## Task 1: Job Entity — latitude/longitude Ekle

**Files:**
- Modify: `nestjs-backend/src/modules/jobs/job.entity.ts`

- [ ] **Step 1: job.entity.ts'e konum alanları ekle**

`featuredOrder` alanının hemen öncesine şunu ekle:

```typescript
  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;
```

- [ ] **Step 2: Backend'i başlat, tablo senkronize olsun**

```bash
cd nestjs-backend && npm run start:dev
```

Beklenen: `[TypeORM] ALTER TABLE "jobs" ADD COLUMN "latitude"` gibi bir log (SQLite sync). Hata yoksa devam.

- [ ] **Step 3: Commit**

```bash
git add nestjs-backend/src/modules/jobs/job.entity.ts
git commit -m "feat: add latitude/longitude to Job entity"
```

---

## Task 2: User Entity — Konum Alanları Ekle

**Files:**
- Modify: `nestjs-backend/src/modules/users/user.entity.ts`

- [ ] **Step 1: user.entity.ts'e konum alanları ekle**

`isAvailable` alanının hemen altına, `createdAt`'ten önce ekle:

```typescript
  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  lastLocationAt: string | null;
```

- [ ] **Step 2: Backend sync kontrol**

Backend zaten çalışıyorsa dosyayı kaydet — TypeORM `synchronize: true` sütunları otomatik ekler. Konsolda hata yoksa tamam.

- [ ] **Step 3: Commit**

```bash
git add nestjs-backend/src/modules/users/user.entity.ts
git commit -m "feat: add latitude/longitude/lastLocationAt to User entity"
```

---

## Task 3: `PATCH /users/me/location` Endpoint

**Files:**
- Modify: `nestjs-backend/src/modules/users/users.service.ts`
- Modify: `nestjs-backend/src/modules/users/users.controller.ts`

- [ ] **Step 1: `users.service.ts`'e `updateLocation` metodu ekle**

`UsersService` sınıfının sonuna (mevcut metodların altına) ekle:

```typescript
  async updateLocation(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.repo.update(id, {
      latitude,
      longitude,
      lastLocationAt: new Date().toISOString(),
    });
  }
```

- [ ] **Step 2: `users.controller.ts`'e endpoint ekle**

Import listesine `Post` yerine/yanına yeni importlar gerekmeyecek — mevcut `Patch`, `Body`, `UseGuards`, `Request` zaten var. Controller'a yeni route ekle, mevcut `@Patch('me')` bloğunun hemen altına:

```typescript
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/location')
  async updateLocation(
    @Request() req: AuthenticatedRequest,
    @Body() body: { latitude: number; longitude: number },
  ) {
    await this.svc.updateLocation(req.user.id, body.latitude, body.longitude);
    return { ok: true };
  }
```

- [ ] **Step 3: Manuel test**

Backend çalışırken (port 3001), önce login yap, token al:
```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"emre@v2.test","password":"Test1234"}' | grep access_token
```

Sonra konum güncelle (token'ı doldur):
```bash
curl -s -X PATCH http://localhost:3001/users/me/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"latitude":41.0082,"longitude":28.9784}'
```

Beklenen: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add nestjs-backend/src/modules/users/users.service.ts \
        nestjs-backend/src/modules/users/users.controller.ts
git commit -m "feat: add PATCH /users/me/location endpoint"
```

---

## Task 4: `GET /jobs/nearby` Endpoint (Haversine)

**Files:**
- Modify: `nestjs-backend/src/modules/jobs/jobs.service.ts`
- Modify: `nestjs-backend/src/modules/jobs/jobs.controller.ts`

- [ ] **Step 1: `jobs.service.ts`'e `findNearby` metodu ekle**

`JobsService` sınıfının sonuna ekle. `DataSource` inject'i gerekiyor — constructor'a eklenecek:

Önce import satırına `DataSource` ekle:
```typescript
import { DataSource, Repository } from 'typeorm';
```

Constructor'a `DataSource` inject et (mevcut `@InjectRepository` satırlarının altına):
```typescript
    private dataSource: DataSource,
```

Servis metodunu ekle:
```typescript
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number = 20,
    category?: string,
  ): Promise<(Job & { distanceKm: number })[]> {
    // Haversine formülü — SQLite uyumlu
    const haversine = `
      (6371 * acos(
        cos(radians(:lat)) *
        cos(radians(j.latitude)) *
        cos(radians(j.longitude) - radians(:lng)) +
        sin(radians(:lat)) *
        sin(radians(j.latitude))
      ))
    `;

    let sql = `
      SELECT j.*,
             ${haversine} AS distanceKm
      FROM jobs j
      WHERE j.latitude IS NOT NULL
        AND j.longitude IS NOT NULL
        AND j.status = 'open'
        AND ${haversine} <= :radiusKm
    `;

    const params: Record<string, unknown> = { lat, lng, radiusKm };

    if (category) {
      sql += ` AND LOWER(j.category) = LOWER(:category)`;
      params.category = category;
    }

    sql += ` ORDER BY distanceKm ASC LIMIT 50`;

    const rows = await this.dataSource.query(sql, params);
    return rows as (Job & { distanceKm: number })[];
  }
```

- [ ] **Step 2: `jobs.controller.ts`'e `GET /jobs/nearby` ekle**

`@Get(':id')` satırının **hemen üstüne** ekle (aksi hâlde "nearby" id olarak yakalanır):

```typescript
  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('category') category?: string,
  ) {
    return this.jobsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radiusKm ? parseFloat(radiusKm) : 20,
      category,
    );
  }
```

- [ ] **Step 3: Manuel test**

Önce seed ilanlardan birine manuel lat/lng ekle (SQLite Browser veya curl ile `PATCH /jobs/:id` — ama PATCH body'ye lat/lng yok henüz). Alternatif: doğrudan SQLite'a yaz:

```bash
# hizmet_db.sqlite'a doğrudan yaz (sqlite3 CLI gerekli)
sqlite3 nestjs-backend/hizmet_db.sqlite \
  "UPDATE jobs SET latitude=41.01, longitude=29.02 WHERE title='Salon Badana';"
```

Sonra endpoint'i test et:
```bash
curl "http://localhost:3001/jobs/nearby?lat=41.0&lng=29.0&radiusKm=50"
```

Beklenen: `[{"id":"...","title":"Salon Badana","distanceKm":1.4,...}]` gibi array.

- [ ] **Step 4: Commit**

```bash
git add nestjs-backend/src/modules/jobs/jobs.service.ts \
        nestjs-backend/src/modules/jobs/jobs.controller.ts
git commit -m "feat: add GET /jobs/nearby endpoint with Haversine distance"
```

---

## Task 5: Flutter — geolocator Paketi + Android İzni

**Files:**
- Modify: `hizmet_app/pubspec.yaml`
- Modify: `hizmet_app/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: pubspec.yaml'a geolocator ekle**

`dependencies:` bloğuna ekle (flutter_map'in yanına):

```yaml
  geolocator: ^13.0.0
```

- [ ] **Step 2: Bağımlılıkları yükle**

```bash
cd hizmet_app && flutter pub get
```

Beklenen: `Resolving dependencies... geolocator 13.x.x` gibi çıktı.

- [ ] **Step 3: Android manifest izni ekle**

`hizmet_app/android/app/src/main/AndroidManifest.xml` dosyasında `<manifest>` tagının hemen içine (ilk `<uses-permission>` satırlarına) ekle:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

- [ ] **Step 4: Commit**

```bash
git add hizmet_app/pubspec.yaml \
        hizmet_app/pubspec.lock \
        hizmet_app/android/app/src/main/AndroidManifest.xml
git commit -m "feat: add geolocator dependency and location permissions"
```

---

## Task 6: Flutter — map_repository.dart

**Files:**
- Create: `hizmet_app/lib/features/map/data/map_repository.dart`

- [ ] **Step 1: Dizin oluştur**

```bash
mkdir -p hizmet_app/lib/features/map/data
mkdir -p hizmet_app/lib/features/map/presentation/providers
mkdir -p hizmet_app/lib/features/map/presentation/screens
```

- [ ] **Step 2: map_repository.dart yaz**

```dart
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class NearbyJob {
  final String id;
  final String title;
  final String category;
  final String location;
  final double distanceKm;
  final double? latitude;
  final double? longitude;
  final double? budgetMin;
  final double? budgetMax;
  final List<String> photos;

  const NearbyJob({
    required this.id,
    required this.title,
    required this.category,
    required this.location,
    required this.distanceKm,
    this.latitude,
    this.longitude,
    this.budgetMin,
    this.budgetMax,
    this.photos = const [],
  });

  factory NearbyJob.fromJson(Map<String, dynamic> j) => NearbyJob(
        id: j['id'] as String,
        title: j['title'] as String,
        category: j['category'] as String? ?? '',
        location: j['location'] as String? ?? '',
        distanceKm: (j['distanceKm'] as num).toDouble(),
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        budgetMin: (j['budgetMin'] as num?)?.toDouble(),
        budgetMax: (j['budgetMax'] as num?)?.toDouble(),
        photos: (j['photos'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );
}

class MapRepository {
  final Dio _dio;

  MapRepository(this._dio);

  Future<List<NearbyJob>> getNearbyJobs({
    required double lat,
    required double lng,
    double radiusKm = 20,
    String? category,
  }) async {
    final params = <String, dynamic>{
      'lat': lat,
      'lng': lng,
      'radiusKm': radiusKm,
      if (category != null) 'category': category,
    };
    final response = await _dio.get(
      '${ApiConstants.baseUrl}/jobs/nearby',
      queryParameters: params,
    );
    final list = response.data as List<dynamic>;
    return list
        .map((e) => NearbyJob.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateLocation({
    required double lat,
    required double lng,
    required String token,
  }) async {
    await _dio.patch(
      '${ApiConstants.baseUrl}/users/me/location',
      data: {'latitude': lat, 'longitude': lng},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add hizmet_app/lib/features/map/
git commit -m "feat: add MapRepository with getNearbyJobs and updateLocation"
```

---

## Task 7: Flutter — map_provider.dart

**Files:**
- Create: `hizmet_app/lib/features/map/presentation/providers/map_provider.dart`

Önce `ApiClient` singleton'ının nasıl erişildiğini kontrol et — projede `apiClientProvider` veya benzeri var mı:

- [ ] **Step 1: Mevcut api_client provider'ını bul**

```bash
grep -r "apiClientProvider\|dioProvider\|ApiClient" hizmet_app/lib --include="*.dart" -l
```

Çıktıya göre aşağıdaki provider'daki `_dio` satırını o provider'dan üret. Eğer `dioProvider` varsa `ref.read(dioProvider)`, yoksa `Dio()` doğrudan kullan.

- [ ] **Step 2: map_provider.dart yaz**

(Aşağıdaki örnekte `dioProvider` yerine projedeki gerçek provider adını koy — Step 1 çıktısına bakarak düzelt)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../../data/map_repository.dart';
import '../../../../../core/providers/auth_provider.dart';
import 'package:dio/dio.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class MapState {
  final LatLng? userLocation;
  final List<NearbyJob> jobs;
  final String? selectedJobId;
  final String activeFilter; // 'all' | category name
  final bool showList;
  final bool locationLoading;
  final String? error;

  const MapState({
    this.userLocation,
    this.jobs = const [],
    this.selectedJobId,
    this.activeFilter = 'all',
    this.showList = false,
    this.locationLoading = true,
    this.error,
  });

  MapState copyWith({
    LatLng? userLocation,
    List<NearbyJob>? jobs,
    String? selectedJobId,
    bool clearSelectedJob = false,
    String? activeFilter,
    bool? showList,
    bool? locationLoading,
    String? error,
    bool clearError = false,
  }) =>
      MapState(
        userLocation: userLocation ?? this.userLocation,
        jobs: jobs ?? this.jobs,
        selectedJobId:
            clearSelectedJob ? null : (selectedJobId ?? this.selectedJobId),
        activeFilter: activeFilter ?? this.activeFilter,
        showList: showList ?? this.showList,
        locationLoading: locationLoading ?? this.locationLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class MapNotifier extends StateNotifier<MapState> {
  final MapRepository _repo;
  final Ref _ref;

  MapNotifier(this._repo, this._ref) : super(const MapState());

  Future<void> init() async {
    await _requestLocationAndLoad();
  }

  Future<void> _requestLocationAndLoad() async {
    state = state.copyWith(locationLoading: true, clearError: true);

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      // Fallback: İstanbul merkezi
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum izni reddedildi. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearbyJobs(istanbul);
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      final loc = LatLng(pos.latitude, pos.longitude);
      state = state.copyWith(userLocation: loc, locationLoading: false);
      await _loadNearbyJobs(loc);
      _startLocationUpdates();
    } catch (_) {
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum alınamadı. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearbyJobs(istanbul);
    }
  }

  void _startLocationUpdates() {
    // Her 30 saniyede bir usta ise backend'e konum gönder
    Stream.periodic(const Duration(seconds: 30)).listen((_) async {
      final authState = _ref.read(authStateProvider);
      if (authState is! AuthAuthenticated) return;

      final loc = state.userLocation;
      if (loc == null) return;

      try {
        await _repo.updateLocation(
          lat: loc.latitude,
          lng: loc.longitude,
          token: authState.token,
        );
      } catch (_) {
        // Sessiz hata — arka plan güncelleme
      }
    });
  }

  Future<void> _loadNearbyJobs(LatLng loc) async {
    try {
      final category =
          state.activeFilter == 'all' ? null : state.activeFilter;
      final jobs = await _repo.getNearbyJobs(
        lat: loc.latitude,
        lng: loc.longitude,
        category: category,
      );
      state = state.copyWith(jobs: jobs);
    } catch (_) {
      state = state.copyWith(error: 'İlanlar yüklenemedi. Tekrar deneyin.');
    }
  }

  void selectJob(String? jobId) =>
      state = state.copyWith(
        selectedJobId: jobId,
        clearSelectedJob: jobId == null,
      );

  void setFilter(String filter) {
    state = state.copyWith(activeFilter: filter, clearSelectedJob: true);
    final loc = state.userLocation;
    if (loc != null) _loadNearbyJobs(loc);
  }

  void toggleView() => state = state.copyWith(showList: !state.showList);

  Future<void> refresh() async {
    final loc = state.userLocation;
    if (loc != null) await _loadNearbyJobs(loc);
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final mapRepositoryProvider = Provider<MapRepository>(
  (ref) => MapRepository(Dio()),
);

final mapProvider =
    StateNotifierProvider<MapNotifier, MapState>((ref) {
  final repo = ref.watch(mapRepositoryProvider);
  return MapNotifier(repo, ref);
});
```

- [ ] **Step 3: authStateProvider import yolunu düzelt**

`AuthAuthenticated` ve `authStateProvider`'ın mevcut yolunu bul:
```bash
grep -r "class AuthAuthenticated" hizmet_app/lib --include="*.dart"
```

Çıktıdaki yola göre `map_provider.dart`'taki import'u düzelt.

- [ ] **Step 4: Commit**

```bash
git add hizmet_app/lib/features/map/presentation/providers/map_provider.dart
git commit -m "feat: add MapNotifier and MapState provider"
```

---

## Task 8: Flutter — map_screen.dart

**Files:**
- Create: `hizmet_app/lib/features/map/presentation/screens/map_screen.dart`

- [ ] **Step 1: map_screen.dart yaz**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../providers/map_provider.dart';
import '../../data/map_repository.dart';

const _kOrangePin = Color(0xFFFFA000);
const _kBluePin = Color(0xFF007DFE);

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();

  @override
  void initState() {
    super.initState();
    // init çalıştır — konum iste ve ilanları yükle
    Future.microtask(() => ref.read(mapProvider.notifier).init());
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapProvider);
    final notifier = ref.read(mapProvider.notifier);

    // Konum değişince haritayı ortala
    ref.listen(mapProvider.select((s) => s.userLocation), (_, loc) {
      if (loc != null) {
        _mapController.move(loc, 14.0);
      }
    });

    final selectedJob = state.selectedJobId != null
        ? state.jobs.firstWhere(
            (j) => j.id == state.selectedJobId,
            orElse: () => state.jobs.first,
          )
        : null;

    return Scaffold(
      body: Column(
        children: [
          _AppBarSection(state: state, notifier: notifier),
          Expanded(
            child: state.showList
                ? _ListView(jobs: state.jobs, onTap: (j) => notifier.selectJob(j.id))
                : Stack(
                    children: [
                      _MapView(
                        state: state,
                        mapController: _mapController,
                        onPinTap: (j) => notifier.selectJob(j.id),
                        onMapTap: () => notifier.selectJob(null),
                      ),
                      if (state.locationLoading)
                        const Center(child: CircularProgressIndicator()),
                      if (state.error != null && state.userLocation == null)
                        _ErrorBanner(message: state.error!, onRetry: notifier.refresh),
                      // İlan sayısı rozeti
                      if (!state.locationLoading && state.jobs.isNotEmpty)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                            ),
                            child: Text(
                              '${state.jobs.length} ilan',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      // Konumuma git butonu
                      if (state.userLocation != null)
                        Positioned(
                          bottom: selectedJob != null ? 120 : 16,
                          right: 16,
                          child: FloatingActionButton.small(
                            heroTag: 'locate',
                            backgroundColor: Colors.white,
                            onPressed: () => _mapController.move(state.userLocation!, 15),
                            child: const Icon(Icons.my_location, color: AppColors.primary),
                          ),
                        ),
                    ],
                  ),
          ),
          if (selectedJob != null && !state.showList)
            _MiniCard(job: selectedJob, onClose: () => notifier.selectJob(null)),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AppBar + toggle + kategori chips
// ─────────────────────────────────────────────────────────────────────────────

class _AppBarSection extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;

  const _AppBarSection({required this.state, required this.notifier});

  static const _categories = ['all', 'Elektrikçi', 'Tesisat', 'Temizlik', 'Boya & Badana', 'Nakliyat'];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary,
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.search, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text('Yakınımdaki ilanlar', style: TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Harita / Liste toggle
                  Container(
                    margin: const EdgeInsets.only(left: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _ToggleBtn(
                          label: '🗺 Harita',
                          active: !state.showList,
                          onTap: () { if (state.showList) notifier.toggleView(); },
                        ),
                        _ToggleBtn(
                          label: '☰ Liste',
                          active: state.showList,
                          onTap: () { if (!state.showList) notifier.toggleView(); },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Kategori chips
            SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: _categories.map((cat) {
                  final isActive = state.activeFilter == cat;
                  final label = cat == 'all' ? 'Tümü' : cat;
                  return GestureDetector(
                    onTap: () => notifier.setFilter(cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(right: 8, bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isActive ? AppColors.primary : Colors.white,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ToggleBtn({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: active ? AppColors.primary : Colors.white.withValues(alpha: 0.8),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Harita görünümü
// ─────────────────────────────────────────────────────────────────────────────

class _MapView extends StatelessWidget {
  final MapState state;
  final MapController mapController;
  final void Function(NearbyJob) onPinTap;
  final VoidCallback onMapTap;

  const _MapView({
    required this.state,
    required this.mapController,
    required this.onPinTap,
    required this.onMapTap,
  });

  @override
  Widget build(BuildContext context) {
    final center = state.userLocation ?? const LatLng(41.0082, 28.9784);

    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: 14,
        onTap: (_, __) => onMapTap(),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.yapgitsin.hizmet_app',
        ),
        // Kullanıcı konumu — mavi pulse
        if (state.userLocation != null)
          CircleLayer(
            circles: [
              CircleMarker(
                point: state.userLocation!,
                radius: 12,
                color: AppColors.primary.withValues(alpha: 0.15),
                borderColor: Colors.transparent,
                borderStrokeWidth: 0,
                useRadiusInMeter: false,
              ),
              CircleMarker(
                point: state.userLocation!,
                radius: 6,
                color: AppColors.primary,
                borderColor: Colors.white,
                borderStrokeWidth: 2,
                useRadiusInMeter: false,
              ),
            ],
          ),
        // İş ilanı pinleri
        MarkerLayer(
          markers: state.jobs
              .where((j) => j.latitude != null && j.longitude != null)
              .map((j) {
            final isSelected = j.id == state.selectedJobId;
            return Marker(
              point: LatLng(j.latitude!, j.longitude!),
              width: isSelected ? 30 : 24,
              height: isSelected ? 30 : 24,
              child: GestureDetector(
                onTap: () => onPinTap(j),
                child: _DropPin(
                  color: isSelected ? _kBluePin : _kOrangePin,
                  size: isSelected ? 30 : 24,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _DropPin extends StatelessWidget {
  final Color color;
  final double size;

  const _DropPin({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.785, // -45 derece
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(100),
            topRight: Radius.circular(100),
            bottomRight: Radius.circular(100),
          ),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.4),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste görünümü
// ─────────────────────────────────────────────────────────────────────────────

class _ListView extends StatelessWidget {
  final List<NearbyJob> jobs;
  final void Function(NearbyJob) onTap;

  const _ListView({required this.jobs, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (jobs.isEmpty) {
      return const Center(
        child: Text('Bu bölgede ilan bulunamadı', style: TextStyle(color: Colors.grey)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: jobs.length,
      itemBuilder: (_, i) {
        final j = jobs[i];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFFFF3E0),
            child: Text(_categoryIcon(j.category), style: const TextStyle(fontSize: 18)),
          ),
          title: Text(j.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('${j.location} · ${j.distanceKm.toStringAsFixed(1)} km',
              style: const TextStyle(fontSize: 12, color: Colors.grey)),
          trailing: const Icon(Icons.chevron_right, color: Colors.grey),
          onTap: () => onTap(j),
        );
      },
    );
  }

  String _categoryIcon(String category) {
    const icons = {
      'Elektrikçi': '⚡',
      'Tesisat': '🔧',
      'Temizlik': '🧹',
      'Boya & Badana': '🖌',
      'Nakliyat': '🚛',
    };
    return icons[category] ?? '🔨';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini kart (pin seçilince)
// ─────────────────────────────────────────────────────────────────────────────

class _MiniCard extends StatelessWidget {
  final NearbyJob job;
  final VoidCallback onClose;

  const _MiniCard({required this.job, required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Kategori ikonu
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(_categoryIcon(job.category), style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 10),
          // Başlık + bilgi
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(job.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  '${job.location} · ${job.distanceKm.toStringAsFixed(1)} km uzakta',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E0),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(job.category,
                          style: const TextStyle(fontSize: 9, color: _kOrangePin, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Teklif Ver butonu
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ElevatedButton(
                onPressed: () => context.push('/jobs/${job.id}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Teklif Ver', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: onClose,
                child: const Icon(Icons.close, size: 18, color: Colors.grey),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _categoryIcon(String category) {
    const icons = {
      'Elektrikçi': '⚡',
      'Tesisat': '🔧',
      'Temizlik': '🧹',
      'Boya & Badana': '🖌',
      'Nakliyat': '🚛',
    };
    return icons[category] ?? '🔨';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hata banner
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBanner({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        color: Colors.amber.shade100,
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.orange),
            const SizedBox(width: 8),
            Expanded(child: Text(message, style: const TextStyle(fontSize: 11))),
            TextButton(
              onPressed: onRetry,
              child: const Text('Yenile', style: TextStyle(fontSize: 11)),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hizmet_app/lib/features/map/presentation/screens/map_screen.dart
git commit -m "feat: add MapScreen with flutter_map, drop pins, mini card, toggle"
```

---

## Task 9: Flutter — main_shell.dart'a Harita Sekmesi Ekle

**Files:**
- Modify: `hizmet_app/lib/features/home/presentation/screens/main_shell.dart`

Mevcut 4-tab yapısını 5-tab'a çıkar:
- 0: Keşfet
- 1: Yapgitsin
- **2: Harita (YENİ)**
- 3: Bildirimler (login guard index **3'e** taşındı)
- 4: Profil

- [ ] **Step 1: Import ekle**

`main_shell.dart` üstüne `map_screen.dart` import'u ekle:

```dart
import '../../../map/presentation/screens/map_screen.dart';
```

- [ ] **Step 2: pages listesine MapScreen ekle**

```dart
    final List<Widget> pages = [
      _HomeTab(onSeeAllRequests: () => _onItemTapped(1)),
      const HizmetAlScreen(),
      const MapScreen(),        // YENİ — index 2
      const NotificationScreen(),
      const ProfileScreen(),
    ];
```

- [ ] **Step 3: Login guard index'ini güncelle**

```dart
  void _onItemTapped(int index) {
    final authState = ref.read(authStateProvider);
    final isLoggedIn = authState is AuthAuthenticated;
    // Bildirimler artık index 3
    if (index == 3 && !isLoggedIn) {
      context.push('/login', extra: {'returnTo': '/'});
      return;
    }
    ref.read(selectedTabProvider.notifier).state = index;
  }
```

- [ ] **Step 4: BottomNavigationBar items güncelle**

```dart
        items: [
          const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Keşfet'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.construction_outlined),
              activeIcon: Icon(Icons.construction),
              label: 'Yapgitsin'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.map_outlined),
              activeIcon: Icon(Icons.map),
              label: 'Harita'),
          BottomNavigationBarItem(
              icon: isLoggedIn
                  ? const Icon(Icons.notifications_outlined)
                  : const Icon(Icons.lock_outline),
              activeIcon: const Icon(Icons.notifications),
              label: 'Bildirimler'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profil'),
        ],
```

- [ ] **Step 5: Flutter build — hata kontrolü**

```bash
cd hizmet_app && flutter analyze lib/features/map/ lib/features/home/
```

Beklenen: `No issues found!` veya sadece uyarı (0 hata).

- [ ] **Step 6: Commit**

```bash
git add hizmet_app/lib/features/home/presentation/screens/main_shell.dart
git commit -m "feat: add Harita tab to bottom nav (index 2)"
```

---

## Task 10: Entegrasyon Testi

- [ ] **Step 1: Backend başlat**

```bash
cd nestjs-backend && npm run start:dev
```

Beklenen: port 3001'de dinliyor, TypeORM sync hata yok.

- [ ] **Step 2: Test ilanına koordinat ekle**

```bash
sqlite3 nestjs-backend/hizmet_db.sqlite \
  "UPDATE jobs SET latitude=41.01, longitude=29.02 WHERE title='Salon Badana'; \
   UPDATE jobs SET latitude=41.03, longitude=28.95 WHERE title='Mutfak Musluk Tamiri';"
```

- [ ] **Step 3: `/jobs/nearby` endpoint doğrula**

```bash
curl "http://localhost:3001/jobs/nearby?lat=41.0&lng=29.0&radiusKm=50"
```

Beklenen: En az 1 ilan, `distanceKm` alanı var.

- [ ] **Step 4: Flutter uygulamayı başlat**

```bash
cd hizmet_app && flutter run -d windows
```

(veya Android emülatör: `flutter run -d emulator-5554`)

- [ ] **Step 5: Harita sekmesini test et**

1. Alt navda "Harita" sekmesine dokun → harita yüklenir
2. İlanlar varsa turuncu pin görünür (koordinat girilmişse)
3. Pine dokun → mini kart açılır
4. "Teklif Ver" → iş detayına gider
5. Toggle → Liste görünümüne geç, aynı ilanlar listelenir
6. Kategori chip'e dokun → filtre çalışır

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: map integration complete — nearby jobs, GPS, pin selection, mini card"
```

---

## Spec Coverage Kontrol

| Spec Gereksinimi | Görev |
|------------------|-------|
| Job entity lat/lng | Task 1 |
| User entity lat/lng + lastLocationAt | Task 2 |
| PATCH /users/me/location | Task 3 |
| GET /jobs/nearby (Haversine) | Task 4 |
| geolocator paketi | Task 5 |
| map_repository | Task 6 |
| MapState + MapNotifier | Task 7 |
| MapScreen (harita + pin + mini kart + toggle) | Task 8 |
| Alt nav'a Harita sekmesi (index 2) | Task 9 |
| GPS izin reddedilince İstanbul fallback | Task 7 step 2 |
| Usta ise 30sn'de konum gönder | Task 7 step 2 |
| Turuncu=ilan, mavi=seçili pin | Task 8 step 1 `_kOrangePin/_kBluePin` |
| Kategori filtre chips | Task 8 `_AppBarSection` |
| Harita ↔ Liste toggle | Task 8 `_ToggleBtn` + notifier.toggleView |
| "Teklif Ver" → job detail | Task 8 `_MiniCard` |
| Login guard Bildirimler (yeni index 3) | Task 9 step 3 |
| Yakında ilan yok empty state | Task 8 `_ListView` |
| Backend erişilemiyor → retry | Task 8 `_ErrorBanner` |
