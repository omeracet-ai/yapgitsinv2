import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final disputeRepositoryProvider = Provider((ref) {
  return DisputeRepository(dio: ref.read(apiClientProvider).dio);
});

class DisputeRepository {
  final Dio _dio;

  DisputeRepository({required Dio dio}) : _dio = dio;

  Future<Map<String, dynamic>> createDispute({
    String? jobId,
    String? bookingId,
    required String againstUserId,
    required String type,
    required String description,
  }) async {
    try {
      final r = await _dio.post(
        '/disputes',
        data: {
          if (jobId != null) 'jobId': jobId,
          if (bookingId != null) 'bookingId': bookingId,
          'againstUserId': againstUserId,
          'type': type,
          'description': description,
        },
      );
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayet oluşturulamadı');
    }
  }

  Future<List<Map<String, dynamic>>> myDisputes() async {
    try {
      final r = await _dio.get('/disputes/mine');
      return List<Map<String, dynamic>>.from(r.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayetler yüklenemedi');
    }
  }

  Future<Map<String, dynamic>> getDetail(String id) async {
    try {
      final r = await _dio.get('/disputes/$id');
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayet bulunamadı');
    }
  }
}
