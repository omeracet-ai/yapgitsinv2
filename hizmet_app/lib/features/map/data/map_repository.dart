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

final mapRepositoryProvider = Provider<MapRepository>((ref) {
  return MapRepository(dio: ref.read(apiClientProvider).dio);
});

class MapRepository {
  final Dio _dio;

  MapRepository({required Dio dio}) : _dio = dio;

  Future<List<NearbyJob>> getNearbyJobs({
    required double lat,
    required double lng,
    double radiusKm = 20,
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
