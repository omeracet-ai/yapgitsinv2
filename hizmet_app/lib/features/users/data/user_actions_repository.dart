import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final userActionsRepositoryProvider = Provider((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return UserActionsRepository(authRepo);
});

class UserActionsRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  UserActionsRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<void> blockUser(String userId) async {
    try {
      await _dio.post('/users/$userId/block', options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Engelleme başarısız');
    }
  }

  Future<void> unblockUser(String userId) async {
    try {
      await _dio.delete('/users/$userId/block', options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<List<Map<String, dynamic>>> blockedUsers() async {
    try {
      final r = await _dio.get('/users/me/blocked', options: await _authOpts());
      return List<Map<String, dynamic>>.from(r.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<void> reportUser(String userId, String reason, {String? description}) async {
    try {
      await _dio.post(
        '/users/$userId/report',
        data: {
          'reason': reason,
          if (description != null && description.isNotEmpty) 'description': description,
        },
        options: await _authOpts(),
      );
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayet gönderilemedi');
    }
  }
}
