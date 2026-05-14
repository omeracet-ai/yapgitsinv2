import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final recommendationRepositoryProvider = Provider((ref) {
  return RecommendationRepository(dio: ref.read(apiClientProvider).dio);
});

/// Recommended jobs for a worker
final recommendedJobsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, workerId) async {
  return ref
      .watch(recommendationRepositoryProvider)
      .getRecommendedJobs(workerId);
});

/// Recommended workers for a job
final recommendedWorkersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, jobId) async {
  return ref
      .watch(recommendationRepositoryProvider)
      .getRecommendedWorkers(jobId);
});

class RecommendationRepository {
  final Dio _dio;
  RecommendationRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> getRecommendedJobs(
      String workerId) async {
    try {
      final res = await _dio.get('/ai/recommend/jobs/$workerId');
      final list = res.data['jobs'] as List? ?? [];
      return List<Map<String, dynamic>>.from(list);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Öneri yüklenemedi');
    }
  }

  Future<List<Map<String, dynamic>>> getRecommendedWorkers(
      String jobId) async {
    try {
      final res = await _dio.get('/ai/recommend/workers/$jobId');
      final list = res.data['workers'] as List? ?? [];
      return List<Map<String, dynamic>>.from(list);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Öneri yüklenemedi');
    }
  }
}
