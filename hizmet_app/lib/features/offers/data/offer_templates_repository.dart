import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final offerTemplatesRepositoryProvider = Provider((ref) {
  return OfferTemplatesRepository(dio: ref.read(apiClientProvider).dio);
});

final offerTemplatesProvider =
    FutureProvider.autoDispose<List<String>>((ref) async {
  return ref.watch(offerTemplatesRepositoryProvider).list();
});

class OfferTemplatesRepository {
  final Dio _dio;

  OfferTemplatesRepository({required Dio dio}) : _dio = dio;

  List<String> _parse(dynamic data) {
    if (data is Map && data['templates'] is List) {
      return List<String>.from(
          (data['templates'] as List).map((e) => e.toString()));
    }
    return const [];
  }

  Future<List<String>> list() async {
    try {
      final res = await _dio.get('/users/me/offer-templates');
      return _parse(res.data);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablonlar yüklenemedi'));
    }
  }

  Future<List<String>> add(String text) async {
    try {
      final res = await _dio.post('/users/me/offer-templates',
          data: {'text': text});
      return _parse(res.data);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon eklenemedi'));
    }
  }

  Future<List<String>> remove(int index) async {
    try {
      final res = await _dio.delete('/users/me/offer-templates/$index');
      return _parse(res.data);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon silinemedi'));
    }
  }

  String _msg(DioException e, String fallback) {
    final s = e.response?.statusCode;
    if (s == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (s == 404) return 'Şablon bulunamadı.';
    if (s == 400) {
      final m = e.response?.data?['message'];
      return m?.toString() ?? 'Geçersiz istek.';
    }
    final m = e.response?.data?['message'];
    return m?.toString() ?? fallback;
  }
}
