import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client_provider.dart';

final jobRepositoryProvider = Provider((ref) {
  return JobRepository(dio: ref.read(apiClientProvider).dio);
});

/// Tam detay: customer bilgisi dahil
final jobDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.watch(jobRepositoryProvider).getJobDetail(id);
});

class JobRepository {
  final Dio _dio;

  JobRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> getJobs({String? category, String? q, String? status}) async {
    try {
      final response = await _dio.get('/jobs', queryParameters: {
        if (category != null) 'category': category,
        if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
        if (status != null) 'status': status,
      });
      return List<Map<String, dynamic>>.from(response.data['data'] as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> createJob(Map<String, dynamic> jobData) async {
    try {
      final response = await _dio.post('/jobs', data: jobData);
      return response.data;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan oluşturulamadı'));
    }
  }

  Future<Map<String, dynamic>> getJobDetail(String id) async {
    try {
      final response = await _dio.get('/jobs/$id');
      return response.data;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan detayı yüklenemedi'));
    }
  }

  /// Müşterinin kendi ilanları
  Future<List<Map<String, dynamic>>> getMyJobs(String customerId) async {
    try {
      final response = await _dio.get(
        '/jobs',
        queryParameters: {'customerId': customerId},
      );
      return List<Map<String, dynamic>>.from(response.data['data'] as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  Future<List<Map<String, dynamic>>> getJobQuestions(String jobId) async {
    try {
      final response = await _dio.get('/jobs/$jobId/questions');
      return List<Map<String, dynamic>>.from(response.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Sorular yüklenemedi'));
    }
  }

  Future<void> postJobQuestion(String jobId, String text, {String? photoUrl}) async {
    try {
      await _dio.post(
        '/jobs/$jobId/questions',
        data: {'text': text, if (photoUrl != null) 'photoUrl': photoUrl},
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Soru gönderilemedi'));
    }
  }

  /// Boost a job — backend keser token ve featuredUntil set eder
  Future<Map<String, dynamic>> boostJob(String jobId, int days) async {
    try {
      final response = await _dio.post(
        '/jobs/$jobId/boost',
        data: {'days': days},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan öne çıkarılamadı'));
    }
  }

  Future<void> postQuestionReply(String jobId, String questionId, String text) async {
    try {
      await _dio.post(
        '/jobs/$jobId/questions/$questionId/replies',
        data: {'text': text},
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Yanıt gönderilemedi'));
    }
  }

  /// Phase 203 — İş ilanı bulk fotoğraf yükle (max 5, XFile → bytes, tek request)
  Future<List<String>> uploadJobPhotosBulk(String jobId, List<XFile> photos) async {
    try {
      final form = FormData();
      for (final f in photos) {
        form.files.add(MapEntry(
          'photos',
          MultipartFile.fromBytes(await f.readAsBytes(), filename: f.name),
        ));
      }
      final res = await _dio.post('/uploads/job-photos', data: form);
      return List<String>.from(res.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Fotoğraflar yüklenemedi'));
    }
  }

  /// Tamamlama fotoğrafları yükle (atanan usta + in_progress/pending_completion)
  Future<List<String>> uploadCompletionPhotos(String jobId, List<XFile> files) async {
    try {
      final form = FormData();
      for (final f in files) {
        form.files.add(MapEntry(
          'photos',
          MultipartFile.fromBytes(await f.readAsBytes(), filename: f.name),
        ));
      }
      final res = await _dio.post(
        '/uploads/completion-photos/$jobId',
        data: form,
      );
      return List<String>.from((res.data['photos'] as List));
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Tamamlama fotoğrafları yüklenemedi'));
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
