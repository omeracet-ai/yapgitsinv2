import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/services/secure_token_store.dart';

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
  // Phase 152 — Yaklaşık konum bilgisi (Voldi-db backfill bayrağı).
  // `locationApprox=true` → koordinat şehir merkezinden türetilmiş, kullanıcı
  // tarafından net pin değil. UI'da yarı saydam + "~" rozeti gösterilir.
  final bool locationApprox;
  final String? locationSource; // 'user-pin' | 'city-centroid' | 'geocode' ...

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
    this.locationApprox = false,
    this.locationSource,
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
        locationApprox: j['locationApprox'] == true,
        locationSource: j['locationSource'] as String?,
      );
}

// ── Phase 178 — Workers nearby ───────────────────────────────────────────────
// Map ekranında turuncu jobs pin'lerine ek olarak mavi worker pin'leri için
// kullanılır. Backend: `GET /users/workers/nearby` (Phase 177 geohash index).
class NearbyWorker {
  final String id;
  final String? name;
  final String? avatarUrl;
  final double? rating;
  final List<String> categories;
  final double? latitude;
  final double? longitude;
  final double distanceKm;
  final bool identityVerified;
  // User entity'sinde locationApprox alanı yok (Phase 177). İleride backfill
  // bayrağı eklenirse buraya bağlanır; şimdilik default false.
  final bool locationApprox;

  const NearbyWorker({
    required this.id,
    this.name,
    this.avatarUrl,
    this.rating,
    this.categories = const [],
    this.latitude,
    this.longitude,
    this.distanceKm = 0,
    this.identityVerified = false,
    this.locationApprox = false,
  });

  factory NearbyWorker.fromJson(Map<String, dynamic> j) {
    final cats = j['workerCategories'];
    List<String> catList = const [];
    if (cats is List) {
      catList = cats.map((e) => e.toString()).toList();
    } else if (cats is String && cats.isNotEmpty) {
      // SQLite bazen JSON string olarak döndürür.
      try {
        final parsed = (cats.startsWith('[') ? cats : '[$cats]');
        // Basit parse: [..] → virgüllü split fallback. JSON kararlı geliyor
        // üretimde; burada hatasız davranmak yeterli.
        catList = parsed
            .replaceAll(RegExp(r'[\[\]"]'), '')
            .split(',')
            .where((s) => s.trim().isNotEmpty)
            .map((s) => s.trim())
            .toList();
      } catch (_) {
        catList = const [];
      }
    }
    return NearbyWorker(
      id: j['id'] as String,
      name: j['fullName'] as String?,
      avatarUrl: j['profileImageUrl'] as String?,
      rating: (j['averageRating'] as num?)?.toDouble(),
      categories: catList,
      latitude: (j['latitude'] as num?)?.toDouble(),
      longitude: (j['longitude'] as num?)?.toDouble(),
      distanceKm: (j['distanceKm'] as num?)?.toDouble() ?? 0,
      identityVerified: j['identityVerified'] == true,
      locationApprox: j['locationApprox'] == true,
    );
  }
}

final mapRepositoryProvider = Provider<MapRepository>((ref) {
  return MapRepository(dio: ref.read(apiClientProvider).dio);
});

class MapRepository {
  final Dio _dio;

  MapRepository({required Dio dio}) : _dio = dio;

  Future<List<NearbyJob>> getNearbyJobs({
    required double lat,
    required double lng,
    double radiusKm = 500,
    String? category,
  }) async {
    final response = await _dio.get('/jobs/nearby', queryParameters: {
      'lat': lat,
      'lng': lng,
      'radiusKm': radiusKm,
      if (category != null) 'category': category,
    });
    final list = response.data as List<dynamic>;
    return list
        .map((e) => NearbyJob.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Phase 178 — Yakındaki ustalar. Backend parametre adları: `lat`, `lon`
  // (lng değil), `radius` (radiusKm değil). Response: `{data, total, page,
  // limit, pages}`.
  Future<List<NearbyWorker>> getNearbyWorkers({
    required double lat,
    required double lon,
    double radiusKm = 500,
    String? category,
    bool? verifiedOnly,
    int? page,
    int? limit,
  }) async {
    final response = await _dio.get('/users/workers/nearby', queryParameters: {
      'lat': lat,
      'lon': lon,
      'radius': radiusKm,
      if (category != null) 'category': category,
      if (verifiedOnly == true) 'verifiedOnly': 'true',
      if (page != null) 'page': page,
      if (limit != null) 'limit': limit,
    });
    final body = response.data;
    final list = (body is Map<String, dynamic>)
        ? (body['data'] as List<dynamic>? ?? const [])
        : (body as List<dynamic>);
    return list
        .map((e) => NearbyWorker.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateLocation({
    required double lat,
    required double lng,
  }) async {
    // P189/4 — preserve the "skip if not signed in" guard; read from
    // SecureTokenStore (the source of truth) instead of legacy SharedPreferences.
    final token = await SecureTokenStore().readToken();
    if (token == null || token.isEmpty) return;
    await _dio.patch(
      '/users/me/location',
      data: {'latitude': lat, 'longitude': lng},
    );
  }
}
