import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final photoRepositoryProvider = Provider((ref) {
  return PhotoRepository(ref.watch(authRepositoryProvider));
});

class PhotoRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  PhotoRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ));

  Future<List<String>> uploadJobPhotos(List<File> files) async {
    try {
      final token = await _authRepository.getToken();
      final formData = FormData();
      for (final file in files) {
        formData.files.add(MapEntry(
          'photos',
          await MultipartFile.fromFile(file.path),
        ));
      }
      final response = await _dio.post(
        '/uploads/job-photos',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return List<String>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraflar yüklenemedi');
    }
  }

  /// Portfolio: yükle + users/me/portfolio'ya ekle. Yeni URL döner.
  Future<String> uploadPortfolioPhoto(File file) async {
    try {
      final token = await _authRepository.getToken();
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path),
      });
      final upResp = await _dio.post(
        '/uploads/portfolio',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final url = (upResp.data as Map)['url'] as String;
      await _dio.post(
        '/users/me/portfolio',
        data: {'url': url},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return url;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Portfolyo yüklenemedi');
    }
  }

  Future<void> removePortfolioPhoto(String url) async {
    try {
      final token = await _authRepository.getToken();
      await _dio.delete(
        '/users/me/portfolio',
        data: {'url': url},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraf silinemedi');
    }
  }

  Future<List<String>> uploadJobVideos(List<File> files) async {
    try {
      final token = await _authRepository.getToken();
      final formData = FormData();
      for (final file in files) {
        formData.files.add(MapEntry(
          'videos',
          await MultipartFile.fromFile(file.path),
        ));
      }
      final response = await _dio.post(
        '/uploads/job-video',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return List<String>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Videolar yüklenemedi');
    }
  }
}
