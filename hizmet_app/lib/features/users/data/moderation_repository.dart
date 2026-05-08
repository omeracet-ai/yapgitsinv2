import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

/// Phase 46 — Block & Report API client.
/// Endpoints:
///   POST/DELETE /users/me/blocks/:userId
///   GET         /users/me/blocks
///   POST        /users/:userId/report
final moderationRepositoryProvider = Provider((ref) {
  return ModerationRepository(ref.watch(authRepositoryProvider));
});

class ModerationRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  ModerationRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  /// Returns true when block is now active.
  Future<bool> blockUser(String userId) async {
    try {
      final r = await _dio.post('/users/me/blocks/$userId',
          options: await _authOpts());
      return r.data is Map ? r.data['blocked'] == true : true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Engelleme başarısız');
    }
  }

  /// Returns false (no longer blocked) on success.
  Future<bool> unblockUser(String userId) async {
    try {
      final r = await _dio.delete('/users/me/blocks/$userId',
          options: await _authOpts());
      return r.data is Map ? r.data['blocked'] == true : false;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getBlocks() async {
    try {
      final r = await _dio.get('/users/me/blocks', options: await _authOpts());
      final data = r.data is Map ? r.data['data'] as List? : r.data as List?;
      return List<Map<String, dynamic>>.from(data ?? []);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Liste yüklenemedi');
    }
  }

  /// reason: spam | harassment | fake_profile | inappropriate_content | other
  Future<Map<String, dynamic>> reportUser(
    String userId,
    String reason, {
    String? description,
  }) async {
    try {
      final r = await _dio.post(
        '/users/$userId/report',
        data: {
          'reason': reason,
          if (description != null && description.isNotEmpty)
            'description': description,
        },
        options: await _authOpts(),
      );
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final msg = e.response?.data is Map
          ? (e.response?.data['message']?.toString())
          : null;
      if (status == 409) {
        throw Exception(msg ?? 'Bu kullanıcıyı zaten şikayet ettin.');
      }
      if (status == 400) {
        throw Exception(msg ?? 'Geçersiz şikayet.');
      }
      throw Exception(msg ?? 'Şikayet gönderilemedi');
    }
  }
}
