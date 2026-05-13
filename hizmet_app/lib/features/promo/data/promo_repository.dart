import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final promoRepositoryProvider = Provider((ref) {
  return PromoRepository(dio: ref.read(apiClientProvider).dio);
});

class PromoRedeemResult {
  final String type;
  final num value;
  final String message;
  final int? trialDays;

  PromoRedeemResult({
    required this.type,
    required this.value,
    required this.message,
    this.trialDays,
  });

  factory PromoRedeemResult.fromJson(Map<String, dynamic> json) {
    return PromoRedeemResult(
      type: (json['type'] ?? '').toString(),
      value: (json['value'] as num?) ?? 0,
      message: (json['message'] ?? 'Kod uygulandı').toString(),
      trialDays: (json['trialDays'] as num?)?.toInt(),
    );
  }
}

class PromoRepository {
  final Dio _dio;

  PromoRepository({required Dio dio}) : _dio = dio;

  Future<PromoRedeemResult> redeem(String code) async {
    try {
      final res = await _dio.post(
        '/promo/redeem',
        data: {'code': code.trim().toUpperCase()},
      );
      return PromoRedeemResult.fromJson(
          Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      final data = e.response?.data;
      String msg = 'Kod uygulanamadı';
      if (data is Map && data['message'] != null) {
        msg = data['message'].toString();
      }
      throw Exception(msg);
    }
  }
}
