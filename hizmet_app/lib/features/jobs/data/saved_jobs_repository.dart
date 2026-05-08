import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final savedJobsRepositoryProvider = Provider((ref) {
  return SavedJobsRepository(ref.watch(authRepositoryProvider));
});

class SavedJobsRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  SavedJobsRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  /// POST → { saved: true, jobId }
  Future<bool> saveJob(String jobId) async {
    try {
      final r = await _dio.post(
        '/jobs/saved/$jobId',
        options: await _authOpts(),
      );
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'İlan kaydedilemedi');
    }
  }

  /// DELETE → { saved: false, jobId }
  Future<bool> unsaveJob(String jobId) async {
    try {
      final r = await _dio.delete(
        '/jobs/saved/$jobId',
        options: await _authOpts(),
      );
      return r.data['saved'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getMySavedJobs() async {
    try {
      final r = await _dio.get(
        '/jobs/saved',
        options: await _authOpts(),
      );
      final data = r.data is Map ? r.data['data'] as List? : r.data as List?;
      return List<Map<String, dynamic>>.from(data ?? []);
    } on DioException catch (e) {
      throw Exception(
          e.response?.data['message'] ?? 'Kaydedilen ilanlar yüklenemedi');
    }
  }
}
