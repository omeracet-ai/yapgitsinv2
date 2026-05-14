import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client_provider.dart';

final serviceRequestRepositoryProvider = Provider(
    (ref) => ServiceRequestRepository(dio: ref.read(apiClientProvider).dio));

class ServiceRequestRepository {
  final Dio _dio;

  ServiceRequestRepository({required Dio dio}) : _dio = dio;

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
      final response = await _dio.get('/service-requests/my');
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
    double? latitude,
    double? longitude,
  }) async {
    try {
      final response = await _dio.post('/service-requests', data: {
        'title': title,
        'description': description,
        'category': category,
        if (categoryId != null) 'categoryId': categoryId,
        'location': location,
        if (address != null && address.isNotEmpty) 'address': address,
        if (imageUrl != null) 'imageUrl': imageUrl,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      });
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan oluşturulamadı'));
    }
  }

  /// Phase 81: SR → Job dönüşümü. SR otomatik kapanır, yeni Job ID döner.
  Future<Map<String, dynamic>> convertToJob(String id) async {
    try {
      final response = await _dio.post('/service-requests/$id/convert-to-job');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Dönüşüm başarısız'));
    }
  }

  Future<void> delete(String id) async {
    try {
      await _dio.delete('/service-requests/$id');
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
      final response = await _dio.post(
        '/service-requests/$serviceRequestId/apply',
        data: {
          if (message != null && message.isNotEmpty) 'message': message,
          if (price != null) 'price': price,
        },
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvuru gönderilemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getApplications(String serviceRequestId) async {
    try {
      final response = await _dio.get(
        '/service-requests/$serviceRequestId/applications',
      );
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvurular yüklenemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getMyApplications() async {
    try {
      final response = await _dio.get('/service-requests/applications/my');
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvurularınız yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> updateApplicationStatus(
      String applicationId, String status) async {
    try {
      final response = await _dio.patch(
        '/service-requests/applications/$applicationId/status',
        data: {'status': status},
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Başvuru durumu güncellenemedi'));
    }
  }

  Future<String> uploadJobPhoto(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final formData = FormData.fromMap({
        'photos': MultipartFile.fromBytes(bytes, filename: 'photo.jpg'),
      });
      final response = await _dio.post('/uploads/job-photos', data: formData);
      final urls = List<String>.from(response.data as List);
      return urls.first;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Fotoğraf yüklenemedi'));
    }
  }

  Future<String> uploadIdentityPhoto(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final formData = FormData.fromMap({
        'photo': MultipartFile.fromBytes(bytes, filename: 'kimlik.jpg'),
      });
      final response = await _dio.post('/uploads/identity-photo', data: formData);
      return response.data['url'] as String;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Kimlik fotoğrafı yüklenemedi'));
    }
  }

  Future<String> uploadDocument(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final formData = FormData.fromMap({
        'photo': MultipartFile.fromBytes(bytes, filename: 'belge.jpg'),
      });
      final response = await _dio.post('/uploads/document', data: formData);
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
