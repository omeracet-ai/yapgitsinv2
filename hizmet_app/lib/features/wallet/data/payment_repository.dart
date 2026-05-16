import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import '../domain/buyer_info.dart';

final paymentRepositoryProvider = Provider((ref) {
  return PaymentRepository(dio: ref.read(apiClientProvider).dio);
});

final earningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(paymentRepositoryProvider).getEarnings();
});

class PaymentRepository {
  final Dio _dio;

  PaymentRepository({required Dio dio}) : _dio = dio;

  /// Phase 244 — iyzipay checkout session oluştur.
  /// IyzicoPaymentScreen tarafından raw Dio yerine bu repo çağrılır.
  ///
  /// Phase 248 — hardcoded buyer payload kaldırıldı. `buyer` null veya empty
  /// ise `user` alanı tamamen omit edilir; backend `CheckoutFormBuyerDto`
  /// server-side fallback uygular (Phase 245).
  Future<Map<String, dynamic>> createSession({
    required double amount,
    BuyerInfo? buyer,
  }) async {
    final body = <String, dynamic>{
      'price': amount.toString(),
      'paidPrice': amount.toString(),
      'basketId': 'B${DateTime.now().millisecondsSinceEpoch}',
    };
    if (buyer != null && !buyer.isEmpty) {
      body['user'] = buyer.toJson();
    }
    final res = await _dio.post('/payments/create-session', data: body);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> getEarnings() async {
    try {
      final res = await _dio.get('/payments/earnings');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'totalEarnings': 0,
        'monthlyEarnings': 0,
        'weeklyEarnings': 0,
        'completedCount': 0,
        'lastTransactions': [],
      };
    }
  }
}
