import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/services/secure_token_store.dart';

final savedJobsRepositoryProvider = Provider((ref) {
  return SavedJobsRepository(dio: ref.read(apiClientProvider).dio);
});

class SavedJobsRepository {
  final Dio _dio;

  SavedJobsRepository({required Dio dio}) : _dio = dio;

  /// Phase 152: anon-guard — /jobs/saved requires auth; calling it without a
  /// JWT triggers a 401 → retry storm → 429 throttle. Short-circuit early.
  Future<bool> _hasToken() async {
    final t = await SecureTokenStore().readToken();
    return t != null && t.isNotEmpty;
  }

  /// POST → { saved: true, jobId }
  Future<bool> saveJob(String jobId) async {
    if (!await _hasToken()) return false;
    try {
      final r = await _dio.post('/jobs/saved/$jobId');
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'İlan kaydedilemedi');
    }
  }

  /// DELETE → { saved: false, jobId }
  Future<bool> unsaveJob(String jobId) async {
    if (!await _hasToken()) return false;
    try {
      final r = await _dio.delete('/jobs/saved/$jobId');
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getMySavedJobs() async {
    if (!await _hasToken()) return const [];
    try {
      final r = await _dio.get('/jobs/saved');
      final data = r.data is Map ? r.data['data'] as List? : r.data as List?;
      return List<Map<String, dynamic>>.from(data ?? []);
    } on DioException catch (e) {
      throw Exception(
          e.response?.data['message'] ?? 'Kaydedilen ilanlar yüklenemedi');
    }
  }
}
