import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final tokenRepositoryProvider = Provider((ref) {
  return TokenRepository(ref.watch(authRepositoryProvider));
});

final tokenBalanceProvider = FutureProvider<int>((ref) async {
  return ref.watch(tokenRepositoryProvider).getBalance();
});

class TokenRepository {
  final AuthRepository _auth;
  final Dio _dio;

  TokenRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<int> getBalance() async {
    final res = await _dio.get('/tokens/balance', options: await _authOpts());
    return ((res.data['balance'] as num?) ?? 0).toInt();
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final res = await _dio.get('/tokens/history', options: await _authOpts());
    return List<Map<String, dynamic>>.from(res.data as List);
  }

  Future<void> purchase(int amount, String paymentMethod) async {
    await _dio.post(
      '/tokens/purchase',
      data: {'amount': amount, 'paymentMethod': paymentMethod},
      options: await _authOpts(),
    );
  }
}
