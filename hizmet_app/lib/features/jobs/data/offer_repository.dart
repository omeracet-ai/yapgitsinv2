import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import '../../../core/services/secure_token_store.dart';

final offerRepositoryProvider = Provider((ref) {
  return OfferRepository(dio: ref.read(apiClientProvider).dio);
});

final jobOffersProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, jobId) async {
  return ref.watch(offerRepositoryProvider).getOffersForJob(jobId);
});

/// Phase 510 — Bu ilanda teklif vermenin kaç krediye mal olacağını döner.
/// Public endpoint (auth gerektirmez); hint banner için kullanılır.
final offerCostPreviewProvider =
    FutureProvider.autoDispose.family<OfferCostPreview?, String>((ref, jobId) async {
  return ref.watch(offerRepositoryProvider).getOfferCost(jobId);
});

/// Phase 510 — Teklif maliyeti önizlemesi (Flutter hint card için).
/// `pct` percent modunda doludur; flat modunda null.
class OfferCostPreview {
  final int cost;
  final double basis;
  final String mode; // 'flat' | 'percent'
  final double? pct;
  final int min;
  final int max;
  final String breakdown;

  const OfferCostPreview({
    required this.cost,
    required this.basis,
    required this.mode,
    required this.pct,
    required this.min,
    required this.max,
    required this.breakdown,
  });

  factory OfferCostPreview.fromJson(Map<String, dynamic> json) =>
      OfferCostPreview(
        cost: (json['cost'] as num?)?.toInt() ?? 0,
        basis: (json['basis'] as num?)?.toDouble() ?? 0,
        mode: (json['mode'] as String?) ?? 'percent',
        pct: (json['pct'] as num?)?.toDouble(),
        min: (json['min'] as num?)?.toInt() ?? 0,
        max: (json['max'] as num?)?.toInt() ?? 0,
        breakdown: (json['breakdown'] as String?) ?? '',
      );
}

class OfferRepository {
  final Dio _dio;

  OfferRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> getOffersForJob(String jobId) async {
    // Guest guard — backend endpoint auth gerektiriyor; token yoksa 401
    // dönüp 'Oturum süresi doldu' Snackbar'ı tetikleniyor. Misafir için
    // boş liste döndür; UI auth-required empty state'ini gösterir.
    final token = await SecureTokenStore().readToken();
    if (token == null || token.isEmpty) return const [];
    try {
      final res = await _dio.get('/jobs/$jobId/offers');
      return List<Map<String, dynamic>>.from(res.data as List);
    } on DioException catch (e) {
      // 401 (token expired/invalid) durumunda da sessizce boş dön — kullanıcı
      // logout veya token revoke senaryosu; teklif yokmuş gibi UI render edilir.
      if (e.response?.statusCode == 401) return const [];
      throw Exception(_dioMsg(e, 'Teklifler yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> createOffer(
      String jobId, double price, String message,
      {List<Map<String, dynamic>>? lineItems,
      String? proposedDate, // YYYY-MM-DD
      String? proposedTime  // HH:MM
      }) async {
    try {
      final body = <String, dynamic>{'price': price, 'message': message};
      if (lineItems != null && lineItems.isNotEmpty) {
        body['lineItems'] = lineItems;
      }
      // Phase 316 — yalnız doluysa gönder; backend opsiyonel + regex doğrular.
      if (proposedDate != null && proposedDate.isNotEmpty) {
        body['proposedDate'] = proposedDate;
      }
      if (proposedTime != null && proposedTime.isNotEmpty) {
        body['proposedTime'] = proposedTime;
      }
      final res = await _dio.post(
        '/jobs/$jobId/offers',
        data: body,
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif gönderilemedi'));
    }
  }

  Future<void> acceptOffer(String jobId, String offerId) async {
    try {
      await _dio.patch('/jobs/$jobId/offers/$offerId/accept');
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif kabul edilemedi'));
    }
  }

  Future<void> rejectOffer(String jobId, String offerId) async {
    try {
      await _dio.patch('/jobs/$jobId/offers/$offerId/reject');
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Teklif reddedilemedi'));
    }
  }

  Future<Map<String, dynamic>> withdrawOffer(String jobId, String offerId) async {
    try {
      final res = await _dio.patch('/jobs/$jobId/offers/$offerId/withdraw');
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
      );
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Pazarlık teklifi gönderilemedi'));
    }
  }

  /// Phase 262 — Karşı tarafın yaptığı son karşı teklifi kabul eder
  /// (anlaşılan fiyatla iş başlar). Her iki marketplace yönünde de çalışır.
  Future<void> acceptCounter(String jobId, String offerId) async {
    try {
      await _dio.patch('/jobs/$jobId/offers/$offerId/accept-counter');
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'Karşı teklif kabul edilemedi'));
    }
  }

  Future<void> updateJob(String jobId, Map<String, dynamic> data) async {
    try {
      await _dio.patch('/jobs/$jobId', data: data);
    } on DioException catch (e) {
      throw Exception(_dioMsg(e, 'İlan güncellenemedi'));
    }
  }

  Future<void> deleteJob(String jobId) async {
    try {
      await _dio.delete('/jobs/$jobId');
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

  /// Phase 510 — Bu ilan için teklif maliyeti önizlemesi.
  /// Public endpoint (auth gerektirmez); hint banner için 200ms civarı çağrılır.
  /// Hata durumunda null döner (silent fail — hint görünmesin yeter).
  Future<OfferCostPreview?> getOfferCost(String jobId) async {
    try {
      final res = await _dio.get('/jobs/$jobId/offer-cost');
      final data = res.data;
      if (data is Map) {
        return OfferCostPreview.fromJson(Map<String, dynamic>.from(data));
      }
      return null;
    } on DioException {
      // 404 / 500 → hint gösterme; teklif submit yine de mümkün.
      return null;
    }
  }

  /// Teklif veren kullanıcının verdiği teklifler — GET /offers/my
  Future<List<Map<String, dynamic>>> getMyOffers() async {
    try {
      final res = await _dio.get('/offers/my');
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
