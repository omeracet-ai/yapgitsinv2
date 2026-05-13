import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import 'worker_filter.dart';

final providerRepositoryProvider = Provider((ref) {
  return ProviderRepository(dio: ref.read(apiClientProvider).dio);
});

/// Worker filter state — Phase 39 (bottom sheet ile güncellenir)
final workerFilterProvider =
    StateProvider<WorkerFilter>((ref) => WorkerFilter.empty);

/// Tüm providerlar (arama destekli + filtre destekli)
final allProvidersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, search) async {
  final filter = ref.watch(workerFilterProvider);
  return ref.watch(providerRepositoryProvider).getAllProviders(
        search: search.isEmpty ? null : search,
        filter: filter,
      );
});

/// Provider detay verisi (provider + user birleşik)
final providerDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, providerId) async {
  return ref.watch(providerRepositoryProvider).getProvider(providerId);
});

/// Kullanıcının provider profili (userId ile)
final myProviderProfileProvider =
    FutureProvider.family<Map<String, dynamic>?, String>((ref, userId) async {
  return ref.watch(providerRepositoryProvider).getProviderByUserId(userId);
});

/// Provider'a ait yorumlar (revieweeId = provider.userId)
final providerReviewsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, userId) async {
  return ref.watch(providerRepositoryProvider).getReviewsForUser(userId);
});

/// Provider'ın tamamladığı işler (fotoğraflı)
final providerCompletedJobsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, providerId) async {
  return ref.watch(providerRepositoryProvider).getCompletedJobs(providerId);
});

class ProviderRepository {
  final Dio _dio;

  ProviderRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> getAllProviders({
    String? search,
    WorkerFilter? filter,
  }) async {
    try {
      final qp = <String, dynamic>{};
      if (search != null) qp['search'] = search;
      if (filter != null) qp.addAll(filter.toQueryMap());
      final response = await _dio.get(
        '/providers',
        queryParameters: qp.isEmpty ? null : qp,
      );
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Sağlayıcılar yüklenemedi');
    }
  }

  Future<Map<String, dynamic>> getProvider(String id) async {
    try {
      final response = await _dio.get('/providers/$id');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Sağlayıcı bilgisi alınamadı');
    }
  }

  Future<Map<String, dynamic>?> getProviderByUserId(String userId) async {
    try {
      final response = await _dio.get('/providers/by-user/$userId');
      if (response.data == null) return null;
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw Exception(e.response?.data['message'] ?? 'Sağlayıcı bilgisi alınamadı');
    }
  }

  Future<Map<String, dynamic>> createProvider({
    required String businessName,
    String? bio,
    Map<String, String>? documents,
  }) async {
    try {
      final response = await _dio.post(
        '/providers',
        data: {
          'businessName': businessName,
          if (bio != null && bio.isNotEmpty) 'bio': bio,
          if (documents != null) 'documents': documents,
        },
      );
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Sağlayıcı profili oluşturulamadı');
    }
  }

  Future<Map<String, dynamic>> updateProvider(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch('/providers/$id', data: data);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Güncelleme başarısız');
    }
  }

  Future<List<Map<String, dynamic>>> getReviewsForUser(String userId) async {
    try {
      final response = await _dio.get('/reviews/user/$userId');
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getCompletedJobs(String providerId) async {
    try {
      final response = await _dio.get('/providers/$providerId/completed-jobs');
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (_) {
      return [];
    }
  }
}
