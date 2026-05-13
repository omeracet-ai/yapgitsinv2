import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final userActionsRepositoryProvider = Provider((ref) {
  return UserActionsRepository(dio: ref.read(apiClientProvider).dio);
});

class UserActionsRepository {
  final Dio _dio;

  UserActionsRepository({required Dio dio}) : _dio = dio;

  Future<void> blockUser(String userId) async {
    try {
      await _dio.post('/users/$userId/block');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Engelleme başarısız');
    }
  }

  Future<void> unblockUser(String userId) async {
    try {
      await _dio.delete('/users/$userId/block');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Bağlantı hatası');
    }
  }

  Future<List<Map<String, dynamic>>> blockedUsers() async {
    try {
      final r = await _dio.get('/users/me/blocked');
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
      );
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayet gönderilemedi');
    }
  }
}
