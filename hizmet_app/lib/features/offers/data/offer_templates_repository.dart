import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final offerTemplatesRepositoryProvider = Provider((ref) {
  return OfferTemplatesRepository(ref.watch(authRepositoryProvider));
});

final offerTemplatesProvider =
    FutureProvider.autoDispose<List<String>>((ref) async {
  return ref.watch(offerTemplatesRepositoryProvider).list();
});

class OfferTemplatesRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  OfferTemplatesRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 6),
          receiveTimeout: const Duration(seconds: 6),
        ));

  Future<Options> _opts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  List<String> _parse(dynamic data) {
    if (data is Map && data['templates'] is List) {
      return List<String>.from(
          (data['templates'] as List).map((e) => e.toString()));
    }
    return const [];
  }

  Future<List<String>> list() async {
    try {
      final res = await _dio.get('/users/me/offer-templates',
          options: await _opts());
      return _parse(res.data);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablonlar yüklenemedi'));
    }
  }

  Future<List<String>> add(String text) async {
    try {
      final res = await _dio.post('/users/me/offer-templates',
          data: {'text': text}, options: await _opts());
      return _parse(res.data);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Şablon eklenemedi'));
    }
  }

  Future<List<String>> remove(int index) async {
    try {
      final res = await _dio.delete('/users/me/offer-templates/$index',
          options: await _opts());
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
