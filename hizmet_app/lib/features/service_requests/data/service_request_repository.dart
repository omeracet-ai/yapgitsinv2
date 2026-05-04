import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_constants.dart';

final serviceRequestRepositoryProvider = Provider((ref) => ServiceRequestRepository());

class ServiceRequestRepository {
  final Dio _dio;

  ServiceRequestRepository()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
        ));

  Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  Future<Options> _authOptions() async {
    final token = await _token();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<List<Map<String, dynamic>>> getAll({String? category}) async {
    try {
      final response = await _dio.get(
        '/service-requests',
        queryParameters: category != null ? {'category': category} : null,
      );
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getMine() async {
    try {
      final opts = await _authOptions();
      final response = await _dio.get('/service-requests/my', options: opts);
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlarınız yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> create({
    required String title,
    required String description,
    required String category,
    String? categoryId,
    required String location,
    String? address,
    String? imageUrl,
  }) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.post('/service-requests', data: {
        'title': title,
        'description': description,
        'category': category,
        if (categoryId != null) 'categoryId': categoryId,
        'location': location,
        if (address != null && address.isNotEmpty) 'address': address,
        if (imageUrl != null) 'imageUrl': imageUrl,
      }, options: opts);
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan oluşturulamadı'));
    }
  }

  Future<void> delete(String id) async {
    try {
      final opts = await _authOptions();
      await _dio.delete('/service-requests/$id', options: opts);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan silinemedi'));
    }
  }

  Future<Map<String, dynamic>> getDetail(String id) async {
    try {
      final response = await _dio.get('/service-requests/$id');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan detayı yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> apply(
      String serviceRequestId, {String? message, double? price}) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.post(
        '/service-requests/$serviceRequestId/apply',
        data: {
          if (message != null && message.isNotEmpty) 'message': message,
          if (price != null) 'price': price,
        },
        options: opts,
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvuru gönderilemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getApplications(String serviceRequestId) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.get(
        '/service-requests/$serviceRequestId/applications',
        options: opts,
      );
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvurular yüklenemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getMyApplications() async {
    try {
      final opts = await _authOptions();
      final response = await _dio.get(
        '/service-requests/applications/my',
        options: opts,
      );
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvurularınız yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> updateApplicationStatus(
      String applicationId, String status) async {
    try {
      final opts = await _authOptions();
      final response = await _dio.patch(
        '/service-requests/applications/$applicationId/status',
        data: {'status': status},
        options: opts,
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvuru durumu güncellenemedi'));
    }
  }

  Future<String> uploadJobPhoto(File file) async {
    try {
      final token = await _token();
      final formData = FormData.fromMap({
        'photos': await MultipartFile.fromFile(file.path, filename: 'photo.jpg'),
      });
      final response = await _dio.post(
        '/uploads/job-photos',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final urls = List<String>.from(response.data as List);
      return urls.first;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Fotoğraf yüklenemedi'));
    }
  }

  Future<String> uploadIdentityPhoto(File file) async {
    try {
      final token = await _token();
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(file.path, filename: 'kimlik.jpg'),
      });
      final response = await _dio.post(
        '/uploads/identity-photo',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data['url'] as String;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Kimlik fotoğrafı yüklenemedi'));
    }
  }

  Future<String> uploadDocument(File file) async {
    try {
      final token = await _token();
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(file.path, filename: 'belge.jpg'),
      });
      final response = await _dio.post(
        '/uploads/document',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data['url'] as String;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Belge yüklenemedi'));
    }
  }

  /// Ortak DioException mesaj yardımcısı
  String _dioMsg(DioException e, String fallback) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (statusCode == 403) return 'Bu işlem için yetkiniz yok.';
    if (statusCode == 404) return 'Kayıt bulunamadı.';
    if (statusCode == 400) {
      final msg = e.response?.data?['message'];
      return msg?.toString() ?? 'Geçersiz istek.';
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
    }
    final msg = e.response?.data?['message'];
    return msg?.toString() ?? fallback;
  }
}
