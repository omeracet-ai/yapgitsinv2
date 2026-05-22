import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final cryptoDepositRepositoryProvider = Provider(
  (ref) => CryptoDepositRepository(dio: ref.read(apiClientProvider).dio),
);

/// USDT-TRC20 manuel yatırım — borsadan hesap cüzdanına gönderim + admin onayı.
class CryptoDepositRepository {
  final Dio _dio;
  CryptoDepositRepository({required Dio dio}) : _dio = dio;

  /// Yatırım yapılacak cüzdan adresi + ağ uyarısı.
  Future<Map<String, dynamic>> getAddress() async {
    try {
      final res = await _dio.get('/crypto-deposits/address');
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Cüzdan adresi alınamadı'));
    }
  }

  /// Yeni yatırım talebi oluştur (admin onayı bekler).
  Future<Map<String, dynamic>> create({
    required double amountUsdt,
    required String txId,
    required int creditAmount,
    String purpose = 'token',
  }) async {
    try {
      final res = await _dio.post('/crypto-deposits', data: {
        'amountUsdt': amountUsdt,
        'txId': txId,
        'creditAmount': creditAmount,
        'purpose': purpose,
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Yatırım talebi gönderilemedi'));
    }
  }

  /// Kullanıcının yatırım geçmişi.
  Future<List<Map<String, dynamic>>> listMine() async {
    try {
      final res = await _dio.get('/crypto-deposits/my');
      return List<Map<String, dynamic>>.from(res.data as List);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Geçmiş yüklenemedi'));
    }
  }

  String _msg(DioException e, String fallback) {
    final code = e.response?.statusCode;
    if (code == 401) return 'Oturum süresi doldu, tekrar giriş yapın.';
    if (code == 400) {
      final m = e.response?.data?['message'];
      return m?.toString() ?? 'Geçersiz istek.';
    }
    final m = e.response?.data?['message'];
    return m?.toString() ?? fallback;
  }
}

/// Kullanıcının yatırım geçmişi provider'ı.
final myCryptoDepositsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.read(cryptoDepositRepositoryProvider).listMine();
});

/// Yatırım cüzdan adresi provider'ı (tek sefer çekilir).
final cryptoDepositAddressProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  return ref.read(cryptoDepositRepositoryProvider).getAddress();
});
