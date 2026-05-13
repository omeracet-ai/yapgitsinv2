import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

class LoyaltyInfo {
  final String referralCode;
  final String tier; // Bronze | Silver | Gold | Platinum
  final int totalSuccess;
  final String? nextTier;
  final int? jobsToNextTier;

  LoyaltyInfo({
    required this.referralCode,
    required this.tier,
    required this.totalSuccess,
    this.nextTier,
    this.jobsToNextTier,
  });

  factory LoyaltyInfo.fromJson(Map<String, dynamic> j) => LoyaltyInfo(
        referralCode: (j['referralCode'] ?? '') as String,
        tier: (j['tier'] ?? 'Bronze') as String,
        totalSuccess: ((j['totalSuccess'] as num?) ?? 0).toInt(),
        nextTier: j['nextTier'] as String?,
        jobsToNextTier: (j['jobsToNextTier'] as num?)?.toInt(),
      );
}

final loyaltyRepositoryProvider = Provider((ref) {
  return LoyaltyRepository(dio: ref.read(apiClientProvider).dio);
});

final loyaltyProvider = FutureProvider<LoyaltyInfo>((ref) async {
  return ref.watch(loyaltyRepositoryProvider).getMy();
});

class LoyaltyRepository {
  final Dio _dio;

  LoyaltyRepository({required Dio dio}) : _dio = dio;

  Future<LoyaltyInfo> getMy() async {
    final res = await _dio.get('/loyalty/my');
    return LoyaltyInfo.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Map<String, dynamic>> redeem(String code) async {
    final res = await _dio.post('/loyalty/redeem', data: {'code': code});
    return Map<String, dynamic>.from(res.data as Map);
  }
}
