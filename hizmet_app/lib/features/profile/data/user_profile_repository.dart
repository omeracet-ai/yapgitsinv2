import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

/// Phase 249 — UserProfileRepository wraps /users/me + public profile endpoints.
/// All callers must go through this repo instead of raw Dio() so JWT refresh
/// + baseUrl + interceptors are handled centrally via ApiClient.
final userProfileRepositoryProvider = Provider<UserProfileRepository>((ref) {
  return UserProfileRepository(dio: ref.read(apiClientProvider).dio);
});

class UserProfileRepository {
  final Dio _dio;

  UserProfileRepository({required Dio dio}) : _dio = dio;

  /// GET /users/me — authenticated user payload (includes profileCompletion).
  Future<Map<String, dynamic>> getMe() async {
    final res = await _dio.get('/users/me');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// PATCH /users/me — partial update against UpdateMeDto (Phase 246).
  /// Returns the updated user payload.
  Future<Map<String, dynamic>> patchMe(Map<String, dynamic> data) async {
    final res = await _dio.patch('/users/me', data: data);
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /users/:id/profile — public profile (Phase 170 cached 60s).
  Future<Map<String, dynamic>> getPublicProfile(String userId) async {
    final res = await _dio.get('/users/$userId/profile');
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// GET /users/:id/availability — public availability slots (Phase 211).
  Future<List<Map<String, dynamic>>> getPublicAvailability(
      String userId) async {
    final res = await _dio.get('/users/$userId/availability');
    final list = res.data as List? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
