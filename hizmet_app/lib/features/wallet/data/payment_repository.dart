import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final paymentRepositoryProvider = Provider((ref) {
  return PaymentRepository(ref.watch(authRepositoryProvider));
});

final earningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(paymentRepositoryProvider).getEarnings();
});

class PaymentRepository {
  final AuthRepository _auth;
  final Dio _dio;

  PaymentRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<Map<String, dynamic>> getEarnings() async {
    try {
      final res = await _dio.get('/payments/earnings', options: await _authOpts());
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
