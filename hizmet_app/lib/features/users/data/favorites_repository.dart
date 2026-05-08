import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final favoritesRepositoryProvider = Provider((ref) {
  return FavoritesRepository(ref.watch(authRepositoryProvider));
});

class FavoritesRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  FavoritesRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  /// Toggle favorite — backend POST returns { favorited: true/false, workerId }
  Future<bool> toggleFavorite(String workerId) async {
    try {
      final r = await _dio.post(
        '/users/me/favorites/$workerId',
        options: await _authOpts(),
      );
      return r.data['favorited'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favori eklenemedi');
    }
  }

  Future<bool> removeFavorite(String workerId) async {
    try {
      final r = await _dio.delete(
        '/users/me/favorites/$workerId',
        options: await _authOpts(),
      );
      return r.data['favorited'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favori kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getMyFavorites() async {
    try {
      final r = await _dio.get(
        '/users/me/favorites',
        options: await _authOpts(),
      );
      final data = r.data is Map ? r.data['data'] as List? : r.data as List?;
      return List<Map<String, dynamic>>.from(data ?? []);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favoriler yüklenemedi');
    }
  }
}
