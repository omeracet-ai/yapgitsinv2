import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

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

final mapRepositoryProvider = Provider<MapRepository>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return MapRepository(authRepo);
});

class MapRepository {
  final AuthRepository _authRepo;
  final Dio _dio;

  MapRepository(this._authRepo)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 10),
        ));

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
    final token = await _authRepo.getToken();
    if (token == null) return;
    await _dio.patch(
      '/users/me/location',
      data: {'latitude': lat, 'longitude': lng},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }
}
