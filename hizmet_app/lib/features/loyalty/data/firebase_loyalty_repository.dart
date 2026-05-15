import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';
import 'loyalty_repository.dart';

export 'loyalty_repository.dart' show LoyaltyInfo;

final firebaseLoyaltyRepositoryProvider = Provider((ref) {
  return FirebaseLoyaltyRepository(fs: FirestoreService.instance);
});

final firebaseLoyaltyProvider = FutureProvider<LoyaltyInfo>((ref) async {
  return ref.watch(firebaseLoyaltyRepositoryProvider).getMy();
});

/// Aliases so screens that import this file can use the original provider names.
final loyaltyRepositoryProvider = firebaseLoyaltyRepositoryProvider;
final loyaltyProvider = firebaseLoyaltyProvider;

class FirebaseLoyaltyRepository {
  final FirestoreService _fs;

  FirebaseLoyaltyRepository({required FirestoreService fs}) : _fs = fs;

  String _calcTier(int totalSuccess) {
    if (totalSuccess >= 100) return 'Platinum';
    if (totalSuccess >= 50) return 'Gold';
    if (totalSuccess >= 20) return 'Silver';
    return 'Bronze';
  }

  String? _nextTier(String tier) {
    const order = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    final idx = order.indexOf(tier);
    if (idx < 0 || idx >= order.length - 1) return null;
    return order[idx + 1];
  }

  int? _jobsToNextTier(int totalSuccess, String tier) {
    const thresholds = {'Bronze': 20, 'Silver': 50, 'Gold': 100};
    final t = thresholds[tier];
    if (t == null) return null;
    return t - totalSuccess;
  }

  Future<LoyaltyInfo> getMy() async {
    final uid = _fs.uid;
    if (uid == null) {
      return LoyaltyInfo(referralCode: '', tier: 'Bronze', totalSuccess: 0);
    }

    final snap = await _fs.getDoc('loyalty_points/$uid');
    if (snap == null) {
      return LoyaltyInfo(referralCode: uid.substring(0, 8).toUpperCase(), tier: 'Bronze', totalSuccess: 0);
    }

    final totalSuccess = (snap['totalSuccess'] as num?)?.toInt() ?? 0;
    final tier = snap['tier']?.toString() ?? _calcTier(totalSuccess);

    return LoyaltyInfo(
      referralCode: snap['referralCode']?.toString() ?? uid.substring(0, 8).toUpperCase(),
      tier: tier,
      totalSuccess: totalSuccess,
      nextTier: _nextTier(tier),
      jobsToNextTier: _jobsToNextTier(totalSuccess, tier),
    );
  }

  /// Referral kodu kullan: kayıt oluştur; Cloud Function puan atar.
  Future<Map<String, dynamic>> redeem(String code) async {
    final uid = _fs.uid;

    final requestId = await _fs.add('payment_requests', {
      'type': 'loyalty_redeem',
      'code': code,
      'userId': uid ?? '',
      'status': 'pending',
    });

    return {'requestId': requestId, 'code': code, 'status': 'pending', 'message': 'Kod işleme alındı.'};
  }
}
