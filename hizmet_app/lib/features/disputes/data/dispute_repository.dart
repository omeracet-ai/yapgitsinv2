import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final disputeRepositoryProvider = Provider((ref) {
  return DisputeRepository(ref.watch(authRepositoryProvider));
});

class DisputeRepository {
  final AuthRepository _auth;
  final Dio _dio;

  DisputeRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Options> _opts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

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
        options: await _opts(),
      );
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayet oluşturulamadı');
    }
  }

  Future<List<Map<String, dynamic>>> myDisputes() async {
    try {
      final r = await _dio.get('/disputes/mine', options: await _opts());
      return List<Map<String, dynamic>>.from(r.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Şikayetler yüklenemedi');
    }
  }
}
