import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/utils/media_utils.dart';

class PortfolioRepository {
  final Dio _dio;

  PortfolioRepository({required Dio dio}) : _dio = dio;

  Future<String> uploadPhoto(XFile file) async {
    try {
      final compressed = await compressImage(file);
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(compressed, filename: file.name),
      });
      final upResp = await _dio.post('/uploads/portfolio', data: formData);
      final url = (upResp.data as Map)['url'] as String;
      final addResp = await _dio.post('/users/me/portfolio', data: {'url': url});
      return (addResp.data as Map)['id'] as String? ?? url;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraf yüklenemedi');
    }
  }

  Future<void> deletePhoto(String id) async {
    try {
      await _dio.delete('/users/me/portfolio/$id');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraf silinemedi');
    }
  }

  Future<List<Map<String, dynamic>>> getPublic(String userId) async {
    try {
      final resp = await _dio.get('/users/$userId/portfolio');
      final list = resp.data as List? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Portfolyo yüklenemedi');
    }
  }

  Future<List<Map<String, dynamic>>> listMine() async {
    try {
      final resp = await _dio.get('/users/me/portfolio');
      final list = resp.data as List? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Portfolyo yüklenemedi');
    }
  }
}

final portfolioRepositoryProvider = Provider<PortfolioRepository>(
  (ref) => PortfolioRepository(dio: ref.read(apiClientProvider).dio),
);
