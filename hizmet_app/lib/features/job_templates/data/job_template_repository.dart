import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final jobTemplateRepositoryProvider = Provider((ref) {
  return JobTemplateRepository(dio: ref.read(apiClientProvider).dio);
});

final jobTemplatesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(jobTemplateRepositoryProvider).listMy();
});

class JobTemplateRepository {
  final Dio _dio;

  JobTemplateRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> listMy() async {
    try {
      final res = await _dio.get('/job-templates');
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
      final res = await _dio.post('/job-templates', data: dto);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon oluşturulamadı'));
    }
  }

  Future<void> delete(String id) async {
    try {
      await _dio.delete('/job-templates/$id');
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon silinemedi'));
    }
  }

  Future<Map<String, dynamic>> instantiate(String id) async {
    try {
      final res = await _dio.post('/job-templates/$id/instantiate');
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
