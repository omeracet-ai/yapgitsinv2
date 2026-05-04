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
        final bytes = await file.readAsBytes();
        final ext = file.path.contains('.') ? file.path.split('.').last.toLowerCase() : 'jpg';
        final filename = 'photo_${DateTime.now().millisecondsSinceEpoch}.${ext.length <= 4 ? ext : 'jpg'}';
        formData.files.add(MapEntry(
          'photos',
          MultipartFile.fromBytes(bytes, filename: filename),
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
}
