import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final reviewRepositoryProvider = Provider((ref) {
  return ReviewRepository(dio: ref.read(apiClientProvider).dio);
});

final receivedReviewsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, userId) {
  return ref.watch(reviewRepositoryProvider).getReviewsForUser(userId);
});

class ReviewRepository {
  final Dio _dio;

  ReviewRepository({required Dio dio}) : _dio = dio;

  Future<void> createReview({
    String? jobId,
    required String revieweeId,
    required int rating,
    required String comment,
  }) async {
    try {
      await _dio.post(
        '/reviews',
        data: {
          if (jobId != null) 'jobId': jobId,
          'revieweeId': revieweeId,
          'rating': rating,
          'comment': comment,
        },
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        throw Exception('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      }
      final msg = e.response?.data?['message'];
      throw Exception(msg ?? 'Yorum gönderilemedi (${status ?? 'bağlantı hatası'})');
    } catch (e) {
      throw Exception('Yorum gönderilemedi: $e');
    }
  }

  Future<Map<String, dynamic>> replyToReview(String reviewId, String text) async {
    try {
      final response = await _dio.post(
        '/reviews/$reviewId/reply',
        data: {'text': text},
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        throw Exception('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      }
      if (status == 403) {
        throw Exception('Bu yoruma yanıt verme yetkiniz yok.');
      }
      if (status == 404) {
        throw Exception('Yorum bulunamadı.');
      }
      final msg = e.response?.data?['message'];
      throw Exception(msg ?? 'Yanıt gönderilemedi (${status ?? 'bağlantı hatası'})');
    } catch (e) {
      throw Exception('Yanıt gönderilemedi: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getReviewsForUser(String userId) async {
    try {
      final response = await _dio.get('/reviews/user/$userId');
      return (response.data as List).cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  /// Phase 212: "Faydalı" oyu gönder
  Future<int> markHelpful(String reviewId) async {
    try {
      final response = await _dio.post('/reviews/$reviewId/helpful');
      return (response.data as Map<String, dynamic>)['helpfulCount'] as int? ?? 0;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 409) throw Exception('Bu yorumu zaten faydalı buldunuz.');
      if (status == 403) throw Exception('Kendi yorumunuza oy veremezsiniz.');
      final msg = e.response?.data?['message'];
      throw Exception(msg ?? 'İstek başarısız ($status)');
    }
  }
}
