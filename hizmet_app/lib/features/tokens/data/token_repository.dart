import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/network/api_client_provider.dart';

final tokenRepositoryProvider = Provider((ref) {
  return TokenRepository(dio: ref.read(apiClientProvider).dio);
});

final tokenBalanceProvider = FutureProvider<int>((ref) async {
  return ref.watch(tokenRepositoryProvider).getBalance();
});

class TokenRepository {
  final Dio _dio;

  TokenRepository({required Dio dio}) : _dio = dio;

  Future<int> getBalance() async {
    final res = await _dio.get('/tokens/balance');
    return ((res.data['balance'] as num?) ?? 0).toInt();
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final res = await _dio.get('/tokens/history');
    return List<Map<String, dynamic>>.from(res.data as List);
  }

  Future<void> purchase(int amount, String paymentMethod) async {
    await _dio.post(
      '/tokens/purchase',
      data: {'amount': amount, 'paymentMethod': paymentMethod},
    );
  }

  Future<String> downloadHistoryPdf({DateTime? from, DateTime? to}) async {
    final qp = <String, dynamic>{};
    if (from != null) qp['from'] = from.toIso8601String();
    if (to != null) qp['to'] = to.toIso8601String();
    final res = await _dio.get<List<int>>(
      '/tokens/history/pdf',
      queryParameters: qp,
      options: Options(responseType: ResponseType.bytes),
    );
    final dir = await getApplicationDocumentsDirectory();
    final stamp = DateTime.now().millisecondsSinceEpoch;
    final path = '${dir.path}/yapgitsin-cuzdan-$stamp.pdf';
    final file = File(path);
    await file.writeAsBytes(res.data ?? <int>[]);
    return path;
  }

  Future<Map<String, dynamic>> giftTokens({
    required String recipientId,
    required int amount,
    String? note,
  }) async {
    final res = await _dio.post(
      '/tokens/gift',
      data: {
        'recipientId': recipientId,
        'amount': amount,
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
