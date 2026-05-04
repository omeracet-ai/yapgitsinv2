import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final providerRepositoryProvider = Provider((ref) {
  return ProviderRepository(ref.watch(authRepositoryProvider));
});

/// Tüm providerlar (arama destekli)
final allProvidersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, search) async {
  return ref.watch(providerRepositoryProvider).getAllProviders(search: search.isEmpty ? null : search);
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
  final AuthRepository _authRepository;
  final Dio _dio;

  ProviderRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ));

  Future<List<Map<String, dynamic>>> getAllProviders({String? search}) async {
    try {
      final response = await _dio.get(
        '/providers',
        queryParameters: search != null ? {'search': search} : null,
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
    required String token,
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
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Sağlayıcı profili oluşturulamadı');
    }
  }

  Future<Map<String, dynamic>> updateProvider(String id, Map<String, dynamic> data) async {
    try {
      final token = await _authRepository.getToken();
      final response = await _dio.patch(
        '/providers/$id',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
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
