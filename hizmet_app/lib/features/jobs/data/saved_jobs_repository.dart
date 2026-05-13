import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final savedJobsRepositoryProvider = Provider((ref) {
  return SavedJobsRepository(dio: ref.read(apiClientProvider).dio);
});

class SavedJobsRepository {
  final Dio _dio;

  SavedJobsRepository({required Dio dio}) : _dio = dio;

  /// POST → { saved: true, jobId }
  Future<bool> saveJob(String jobId) async {
    try {
      final r = await _dio.post('/jobs/saved/$jobId');
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'İlan kaydedilemedi');
    }
  }

  /// DELETE → { saved: false, jobId }
  Future<bool> unsaveJob(String jobId) async {
    try {
      final r = await _dio.delete('/jobs/saved/$jobId');
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getMySavedJobs() async {
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
