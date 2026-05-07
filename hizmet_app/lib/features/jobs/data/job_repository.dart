import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final jobRepositoryProvider = Provider((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return JobRepository(authRepo);
});

/// Tam detay: customer bilgisi dahil
final jobDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.watch(jobRepositoryProvider).getJobDetail(id);
});

class JobRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  JobRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
        ));

  Future<List<Map<String, dynamic>>> getJobs({String? category}) async {
    try {
      final response = await _dio.get('/jobs', queryParameters: {
        if (category != null) 'category': category,
      });
      return List<Map<String, dynamic>>.from(response.data['data'] as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlanlar yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> createJob(Map<String, dynamic> jobData) async {
    try {
      final token = await _authRepository.getToken();
      final response = await _dio.post(
        '/jobs',
        data: jobData,
        options: Options(headers: {
          'Authorization': 'Bearer $token',
        }),
      );
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
      final token = await _authRepository.getToken();
      final response = await _dio.get(
        '/jobs',
        queryParameters: {'customerId': customerId},
        options: token != null
            ? Options(headers: {'Authorization': 'Bearer $token'})
            : null,
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
      final token = await _authRepository.getToken();
      await _dio.post(
        '/jobs/$jobId/questions',
        data: {'text': text, if (photoUrl != null) 'photoUrl': photoUrl},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Soru gönderilemedi'));
    }
  }

  /// Boost a job — backend keser token ve featuredUntil set eder
  Future<Map<String, dynamic>> boostJob(String jobId, int days) async {
    try {
      final token = await _authRepository.getToken();
      final response = await _dio.post(
        '/jobs/$jobId/boost',
        data: {'days': days},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan öne çıkarılamadı'));
    }
  }

  Future<void> postQuestionReply(String jobId, String questionId, String text) async {
    try {
      final token = await _authRepository.getToken();
      await _dio.post(
        '/jobs/$jobId/questions/$questionId/replies',
        data: {'text': text},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Yanıt gönderilemedi'));
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
