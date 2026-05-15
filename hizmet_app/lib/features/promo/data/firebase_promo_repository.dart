// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebasePromoRepositoryProvider =
    Provider((_) => FirebasePromoRepository());

/// Alias so screens that import this file can use [promoRepositoryProvider].
final promoRepositoryProvider = firebasePromoRepositoryProvider;

class PromoRedeemResult {
  final String type;
  final num value;
  final String message;
  final int? trialDays;
  PromoRedeemResult({required this.type, required this.value, required this.message, this.trialDays});
  factory PromoRedeemResult.fromJson(Map<String, dynamic> j) => PromoRedeemResult(
    type: (j['type'] ?? '').toString(),
    value: (j['value'] as num?) ?? 0,
    message: (j['message'] ?? 'Kod uygulandı').toString(),
    trialDays: (j['trialDays'] as num?)?.toInt(),
  );
}

class PromoValidateResult {
  final bool valid;
  final num discount;
  final String type;
  final String description;
  PromoValidateResult({required this.valid, required this.discount, required this.type, required this.description});
  factory PromoValidateResult.fromJson(Map<String, dynamic> j) => PromoValidateResult(
    valid: (j['valid'] as bool?) ?? false,
    discount: (j['discount'] as num?) ?? 0,
    type: (j['type'] ?? 'percent').toString(),
    description: (j['description'] ?? '').toString(),
  );
}

class PromoApplyResult {
  final String message;
  final int? tokensAdded;
  PromoApplyResult({required this.message, this.tokensAdded});
}

class FirebasePromoRepository {
  final _fs = FirestoreService.instance;

  Future<PromoValidateResult> validate(String code) async {
    final snap = await _fs.col('promo_codes')
        .where('code', isEqualTo: code.toUpperCase())
        .where('isActive', isEqualTo: true)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) {
      return PromoValidateResult(valid: false, discount: 0, type: 'percent', description: 'Geçersiz kod');
    }
    final data = snap.docs.first.data();
    return PromoValidateResult.fromJson({...data, 'valid': true});
  }

  Future<PromoRedeemResult> redeem(String code) async {
    final uid = _fs.uid!;
    final snap = await _fs.col('promo_codes')
        .where('code', isEqualTo: code.toUpperCase())
        .where('isActive', isEqualTo: true)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) throw Exception('Geçersiz veya süresi dolmuş kod');
    final promoDoc = snap.docs.first;
    final data = promoDoc.data();

    // Kullanım kaydı oluştur
    await _fs.add('promo_redemptions', {
      'userId': uid,
      'promoCodeId': promoDoc.id,
      'code': code.toUpperCase(),
      'discount': data['discount'],
      'type': data['type'],
    });

    // Kullanım sayısını artır
    await promoDoc.reference.update({'usageCount': FieldValue.increment(1)});

    return PromoRedeemResult.fromJson({...data, 'message': 'Kod başarıyla uygulandı'});
  }

  /// Alias for [redeem] that returns [PromoApplyResult] (for compatibility).
  Future<PromoApplyResult> apply(String code) async {
    final result = await redeem(code);
    return PromoApplyResult(
      message: result.message,
      tokensAdded: result.type == 'token' ? result.value.toInt() : null,
    );
  }

  Future<List<Map<String, dynamic>>> myRedemptions() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    return _fs.query(
      _fs.col('promo_redemptions')
          .where('userId', isEqualTo: uid)
          .orderBy('createdAt', descending: true),
    );
  }
}
