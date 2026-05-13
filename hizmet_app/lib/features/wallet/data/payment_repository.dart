import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final paymentRepositoryProvider = Provider((ref) {
  return PaymentRepository(dio: ref.read(apiClientProvider).dio);
});

final earningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(paymentRepositoryProvider).getEarnings();
});

class PaymentRepository {
  final Dio _dio;

  PaymentRepository({required Dio dio}) : _dio = dio;

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
