import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final jobTemplateRepositoryProvider = Provider((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return JobTemplateRepository(authRepo);
});

final jobTemplatesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(jobTemplateRepositoryProvider).listMy();
});

class JobTemplateRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  JobTemplateRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<List<Map<String, dynamic>>> listMy() async {
    try {
      final res = await _dio.get('/job-templates', options: await _authOpts());
      final data = res.data;
      if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      }
      if (data is Map && data['data'] is List) {
        return List<Map<String, dynamic>>.from(data['data'] as List);
      }
      return [];
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablonlar yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> dto) async {
    try {
      final res = await _dio.post('/job-templates',
          data: dto, options: await _authOpts());
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon oluşturulamadı'));
    }
  }

  Future<void> delete(String id) async {
    try {
      await _dio.delete('/job-templates/$id', options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon silinemedi'));
    }
  }

  Future<Map<String, dynamic>> instantiate(String id) async {
    try {
      final res = await _dio.post('/job-templates/$id/instantiate',
          options: await _authOpts());
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'İlan oluşturulamadı'));
    }
  }

  String _msg(DioException e, String fallback) {
    final code = e.response?.statusCode;
    if (code == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (code == 403) return 'Bu işlem için yetkiniz yok.';
    if (code == 404) return 'Şablon bulunamadı.';
    final m = e.response?.data is Map ? e.response?.data['message'] : null;
    return m?.toString() ?? fallback;
  }
}
