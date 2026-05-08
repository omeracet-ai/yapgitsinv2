import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final offerRepositoryProvider = Provider((ref) {
  return OfferRepository(ref.watch(authRepositoryProvider));
});

final jobOffersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, jobId) async {
  return ref.watch(offerRepositoryProvider).getOffersForJob(jobId);
});

class OfferRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  OfferRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final token = await _authRepository.getToken();
    return Options(headers: {'Authorization': 'Bearer $token'});
  }

  Future<List<Map<String, dynamic>>> getOffersForJob(String jobId) async {
    try {
      final token = await _authRepository.getToken();
      final res = await _dio.get(
        '/jobs/$jobId/offers',
        options: token != null
            ? Options(headers: {'Authorization': 'Bearer $token'})
            : null,
      );
      return List<Map<String, dynamic>>.from(res.data as List);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklifler yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> createOffer(
      String jobId, double price, String message,
      {List<Map<String, dynamic>>? lineItems}) async {
    try {
      final body = <String, dynamic>{'price': price, 'message': message};
      if (lineItems != null && lineItems.isNotEmpty) {
        body['lineItems'] = lineItems;
      }
      final res = await _dio.post(
        '/jobs/$jobId/offers',
        data: body,
        options: await _authOpts(),
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif gönderilemedi'));
    }
  }

  Future<void> acceptOffer(String jobId, String offerId) async {
    try {
      await _dio.patch('/jobs/$jobId/offers/$offerId/accept',
          options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif kabul edilemedi'));
    }
  }

  Future<void> rejectOffer(String jobId, String offerId) async {
    try {
      await _dio.patch('/jobs/$jobId/offers/$offerId/reject',
          options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif reddedilemedi'));
    }
  }

  Future<Map<String, dynamic>> withdrawOffer(String jobId, String offerId) async {
    try {
      final res = await _dio.patch(
        '/jobs/$jobId/offers/$offerId/withdraw',
        options: await _authOpts(),
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif geri çekilemedi'));
    }
  }

  Future<void> counterOffer(
      String jobId, String offerId, double price, String message) async {
    try {
      await _dio.patch(
        '/jobs/$jobId/offers/$offerId/counter',
        data: {'counterPrice': price, 'counterMessage': message},
        options: await _authOpts(),
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Pazarlık teklifi gönderilemedi'));
    }
  }

  Future<void> updateJob(String jobId, Map<String, dynamic> data) async {
    try {
      await _dio.patch('/jobs/$jobId', data: data, options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan güncellenemedi'));
    }
  }

  Future<void> deleteJob(String jobId) async {
    try {
      await _dio.delete('/jobs/$jobId', options: await _authOpts());
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan silinemedi'));
    }
  }

  /// Ortak DioException mesaj yardımcısı
  String _dioMsg(DioException e, String fallback) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (statusCode == 403) return 'Bu işlem için yetkiniz yok.';
    if (statusCode == 404) return 'İstek bulunamadı.';
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

  /// Ustanın verdiği teklifler — GET /offers/my
  Future<List<Map<String, dynamic>>> getMyOffers() async {
    try {
      final res = await _dio.get(
        '/offers/my',
        options: await _authOpts(),
      );
      return List<Map<String, dynamic>>.from(res.data['data'] as List);
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      final msg = e.response?.data?['message'];
      if (statusCode == 401) throw Exception('Oturum süresi doldu, tekrar giriş yapın.');
      if (statusCode == 403) throw Exception('Bu işlem için yetkiniz yok.');
      if (statusCode == 404) throw Exception('Teklifler bulunamadı.');
      if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
        throw Exception('Bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.');
      }
      if (e.type == DioExceptionType.connectionError) {
        throw Exception('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      }
      throw Exception(msg?.toString() ?? 'Teklifler yüklenemedi');
    }
  }
}
