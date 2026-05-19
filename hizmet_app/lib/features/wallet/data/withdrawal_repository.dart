import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';
import 'withdrawal_request.dart';

class WithdrawalRepository {
  final Dio _dio;
  WithdrawalRepository({required Dio dio}) : _dio = dio;

  Future<int> getAvailableBalanceMinor() async {
    final res = await _dio.get('/wallet/balance');
    final data = Map<String, dynamic>.from(res.data as Map);
    return ((data['availableMinor'] as num?) ?? 0).toInt();
  }

  Future<WithdrawalRequestModel> requestWithdrawal({
    required int amountMinor,
    required String iban,
    required String accountHolderName,
    String? workerNote,
  }) async {
    final res = await _dio.post('/wallet/withdraw', data: {
      'amountMinor': amountMinor,
      'iban': iban,
      'accountHolderName': accountHolderName,
      if (workerNote != null && workerNote.isNotEmpty) 'workerNote': workerNote,
    });
    return WithdrawalRequestModel.fromJson(
      Map<String, dynamic>.from(res.data as Map),
    );
  }

  Future<List<WithdrawalRequestModel>> listMyWithdrawals({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _dio.get(
      '/wallet/withdrawals',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = Map<String, dynamic>.from(res.data as Map);
    final items = (data['items'] as List?) ?? const [];
    return items
        .map((e) => WithdrawalRequestModel.fromJson(
              Map<String, dynamic>.from(e as Map),
            ))
        .toList();
  }
}

final withdrawalRepositoryProvider = Provider((ref) {
  return WithdrawalRepository(dio: ref.read(apiClientProvider).dio);
});

final withdrawalBalanceProvider = FutureProvider.autoDispose<int>((ref) async {
  return ref.watch(withdrawalRepositoryProvider).getAvailableBalanceMinor();
});

final withdrawalHistoryProvider =
    FutureProvider.autoDispose<List<WithdrawalRequestModel>>((ref) async {
  return ref.watch(withdrawalRepositoryProvider).listMyWithdrawals();
});
