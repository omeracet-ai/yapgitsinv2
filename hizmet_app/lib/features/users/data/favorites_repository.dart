import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final favoritesRepositoryProvider = Provider((ref) {
  return FavoritesRepository(dio: ref.read(apiClientProvider).dio);
});

class FavoritesRepository {
  final Dio _dio;

  FavoritesRepository({required Dio dio}) : _dio = dio;

  /// Toggle favorite — backend POST returns { favorited: true/false, workerId }
  Future<bool> toggleFavorite(String workerId) async {
    try {
      final r = await _dio.post('/users/me/favorites/$workerId');
      return r.data['favorited'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favori eklenemedi');
    }
  }

  Future<bool> removeFavorite(String workerId) async {
    try {
      final r = await _dio.delete('/users/me/favorites/$workerId');
      return r.data['favorited'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favori kaldırılamadı');
    }
  }

  Future<List<Map<String, dynamic>>> getMyFavorites() async {
    try {
      final r = await _dio.get('/users/me/favorites');
      final data = r.data is Map ? r.data['data'] as List? : r.data as List?;
      return List<Map<String, dynamic>>.from(data ?? []);
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Favoriler yüklenemedi');
    }
  }
}
