import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final photoRepositoryProvider = Provider((ref) {
  return PhotoRepository(dio: ref.read(apiClientProvider).dio);
});

class PhotoRepository {
  final Dio _dio;

  PhotoRepository({required Dio dio}) : _dio = dio;

  Future<List<String>> uploadJobPhotos(List<File> files) async {
    try {
      final formData = FormData();
      for (final file in files) {
        formData.files.add(MapEntry(
          'photos',
          await MultipartFile.fromFile(file.path),
        ));
      }
      final response = await _dio.post('/uploads/job-photos', data: formData);
      return List<String>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraflar yüklenemedi');
    }
  }

  /// Portfolio: yükle + users/me/portfolio'ya ekle. Yeni URL döner.
  Future<String> uploadPortfolioPhoto(File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path),
      });
      final upResp = await _dio.post('/uploads/portfolio', data: formData);
      final url = (upResp.data as Map)['url'] as String;
      await _dio.post('/users/me/portfolio', data: {'url': url});
      return url;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Portfolyo yüklenemedi');
    }
  }

  Future<void> removePortfolioPhoto(String url) async {
    try {
      await _dio.delete('/users/me/portfolio', data: {'url': url});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Fotoğraf silinemedi');
    }
  }

  /// Phase 72: profil fotoğrafı yükle. Backend 512×512 crop + jpeg.
  /// URL döner; çağıran taraf PATCH /users/me ile profileImageUrl'i kaydetmeli.
  Future<String> uploadProfilePhoto(File file) async {
    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(file.path),
      });
      final resp = await _dio.post('/uploads/profile-photo', data: formData);
      return (resp.data as Map)['url'] as String;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Profil fotoğrafı yüklenemedi');
    }
  }

  /// Phase 125: portfolio videosu yükle + users/me/portfolio-video'ya ekle.
  Future<String> uploadPortfolioVideo(File file) async {
    try {
      final formData = FormData.fromMap({
        'video': await MultipartFile.fromFile(file.path),
      });
      final upResp = await _dio.post('/uploads/portfolio-video', data: formData);
      final url = (upResp.data as Map)['url'] as String;
      await _dio.post('/users/me/portfolio-video', data: {'url': url});
      return url;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Video yüklenemedi');
    }
  }

  Future<void> removePortfolioVideo(String url) async {
    try {
      await _dio.delete('/users/me/portfolio-video', data: {'url': url});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Video silinemedi');
    }
  }

  /// Phase 152: tanıtım videosu yükle (60sec cap) + users/me/intro-video set.
  Future<Map<String, dynamic>> uploadIntroVideo(File file, {int? durationSeconds}) async {
    try {
      final formData = FormData.fromMap({
        'video': await MultipartFile.fromFile(file.path),
        if (durationSeconds != null) 'duration': durationSeconds.toString(),
      });
      final upResp = await _dio.post('/uploads/intro-video', data: formData);
      final upMap = upResp.data as Map;
      final url = upMap['url'] as String;
      final dur = (upMap['duration'] as num?)?.toInt() ?? durationSeconds;
      final setResp = await _dio.post(
        '/users/me/intro-video',
        data: {'url': url, 'duration': dur},
      );
      return Map<String, dynamic>.from(setResp.data as Map);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Tanıtım videosu yüklenemedi');
    }
  }

  Future<void> removeIntroVideo() async {
    try {
      await _dio.delete('/users/me/intro-video');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Video silinemedi');
    }
  }

  Future<List<String>> uploadJobVideos(List<File> files) async {
    try {
      final formData = FormData();
      for (final file in files) {
        formData.files.add(MapEntry(
          'videos',
          await MultipartFile.fromFile(file.path),
        ));
      }
      final response = await _dio.post('/uploads/job-video', data: formData);
      return List<String>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Videolar yüklenemedi');
    }
  }
}
