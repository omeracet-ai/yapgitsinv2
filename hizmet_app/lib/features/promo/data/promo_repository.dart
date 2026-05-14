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

class PromoValidateResult {
  final bool valid;
  final num discount;
  final String type;
  final String description;

  PromoValidateResult({
    required this.valid,
    required this.discount,
    required this.type,
    required this.description,
  });

  factory PromoValidateResult.fromJson(Map<String, dynamic> json) {
    return PromoValidateResult(
      valid: (json['valid'] as bool?) ?? false,
      discount: (json['discount'] as num?) ?? 0,
      type: (json['type'] ?? 'percent').toString(),
      description: (json['description'] ?? '').toString(),
    );
  }
}

class PromoApplyResult {
  final bool success;
  final num? tokensAdded;

  PromoApplyResult({required this.success, this.tokensAdded});

  factory PromoApplyResult.fromJson(Map<String, dynamic> json) {
    return PromoApplyResult(
      success: (json['success'] as bool?) ?? false,
      tokensAdded: json['tokensAdded'] as num?,
    );
  }
}

class PromoRepository {
  final Dio _dio;

  PromoRepository({required Dio dio}) : _dio = dio;

  Future<PromoValidateResult> validate(String code) async {
    try {
      final res = await _dio.get('/promo/${Uri.encodeComponent(code.trim().toUpperCase())}/validate');
      return PromoValidateResult.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      final data = e.response?.data;
      String msg = 'Doğrulama başarısız';
      if (data is Map && data['message'] != null) msg = data['message'].toString();
      throw Exception(msg);
    }
  }

  Future<PromoApplyResult> apply(String code) async {
    try {
      final res = await _dio.post('/promo/${Uri.encodeComponent(code.trim().toUpperCase())}/apply');
      return PromoApplyResult.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      final data = e.response?.data;
      String msg = 'Kod uygulanamadı';
      if (data is Map && data['message'] != null) msg = data['message'].toString();
      throw Exception(msg);
    }
  }

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
