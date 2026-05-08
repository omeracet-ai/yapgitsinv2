import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

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
  return LoyaltyRepository(ref.watch(authRepositoryProvider));
});

final loyaltyProvider = FutureProvider<LoyaltyInfo>((ref) async {
  return ref.watch(loyaltyRepositoryProvider).getMy();
});

class LoyaltyRepository {
  final AuthRepository _auth;
  final Dio _dio;

  LoyaltyRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _opts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<LoyaltyInfo> getMy() async {
    final res = await _dio.get('/loyalty/my', options: await _opts());
    return LoyaltyInfo.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Map<String, dynamic>> redeem(String code) async {
    final res = await _dio.post(
      '/loyalty/redeem',
      data: {'code': code},
      options: await _opts(),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
