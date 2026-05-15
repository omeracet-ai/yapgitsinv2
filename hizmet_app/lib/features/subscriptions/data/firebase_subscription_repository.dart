import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';
import 'subscription_repository.dart';

export 'subscription_repository.dart'
    show UserSubscription, SubscriptionPlan, SubscribeResult;

final firebaseSubscriptionRepositoryProvider = Provider((ref) {
  return FirebaseSubscriptionRepository(fs: FirestoreService.instance);
});

final firebaseSubscriptionPlansProvider = FutureProvider<List<SubscriptionPlan>>((ref) async {
  return ref.watch(firebaseSubscriptionRepositoryProvider).getPlans();
});

final firebaseMySubscriptionProvider = FutureProvider<UserSubscription?>((ref) async {
  return ref.watch(firebaseSubscriptionRepositoryProvider).getMySubscription();
});

/// Aliases so screens that import this file can use the original provider names.
final subscriptionRepositoryProvider = firebaseSubscriptionRepositoryProvider;
final subscriptionPlansProvider = firebaseSubscriptionPlansProvider;
final mySubscriptionProvider = firebaseMySubscriptionProvider;

class FirebaseSubscriptionRepository {
  final FirestoreService _fs;

  FirebaseSubscriptionRepository({required FirestoreService fs}) : _fs = fs;

  DateTime? _toDate(dynamic v) {
    if (v == null) return null;
    if (v is Timestamp) return v.toDate();
    return DateTime.tryParse(v.toString());
  }

  Future<List<SubscriptionPlan>> getPlans() async {
    final docs = await _fs.query(_fs.col('subscription_plans').orderBy('price'));
    return docs.map((d) => SubscriptionPlan.fromJson(d)).toList();
  }

  Future<UserSubscription?> getMySubscription() async {
    final uid = _fs.uid;
    if (uid == null) return null;
    final snap = await _fs.getDoc('subscriptions/$uid');
    if (snap == null) return null;

    final planSnap = await _fs.getDoc('subscription_plans/${snap['planKey']}');
    if (planSnap == null) return null;

    return UserSubscription(
      plan: SubscriptionPlan.fromJson(planSnap),
      status: snap['status']?.toString() ?? 'inactive',
      startedAt: _toDate(snap['startedAt']),
      expiresAt: _toDate(snap['expiresAt']),
      cancelledAt: _toDate(snap['cancelledAt']),
    );
  }

  /// Abonelik başlat: payment_requests'e kayıt ekle; Cloud Function iyzipay checkout başlatır.
  Future<SubscribeResult> subscribe(String planKey) async {
    final uid = _fs.uid;

    final requestId = await _fs.add('payment_requests', {
      'type': 'subscription_subscribe',
      'planKey': planKey,
      'userId': uid ?? '',
      'status': 'pending',
    });

    // Abonelik dokümanı pending durumda oluştur
    await _fs.db.doc('subscriptions/${uid ?? requestId}').set({
      'planKey': planKey,
      'userId': uid ?? '',
      'status': 'pending',
      'paymentRequestId': requestId,
      'createdAt': _fs.serverNow,
      'updatedAt': _fs.serverNow,
    }, SetOptions(merge: true));

    return SubscribeResult(
      subscriptionId: requestId,
      paymentUrl: '',
      paymentToken: requestId,
      mock: false,
    );
  }

  /// iyzipay token confirm: payment_requests'e kayıt ekle; Cloud Function işler.
  Future<Map<String, dynamic>> confirm(String token) async {
    final uid = _fs.uid;

    await _fs.add('payment_requests', {
      'type': 'subscription_confirm',
      'token': token,
      'userId': uid ?? '',
      'status': 'pending',
    });

    return {'token': token, 'status': 'pending', 'message': 'Ödeme doğrulama işleme alındı.'};
  }

  /// Abonelik iptal: payment_requests'e kayıt ekle; Cloud Function işler.
  Future<Map<String, dynamic>> cancel() async {
    final uid = _fs.uid;

    await _fs.add('payment_requests', {
      'type': 'subscription_cancel',
      'userId': uid ?? '',
      'status': 'pending',
    });

    if (uid != null) {
      await _fs.update('subscriptions/$uid', {
        'status': 'cancel_pending',
        'cancelledAt': _fs.serverNow,
      });
    }

    return {'status': 'cancel_pending', 'message': 'İptal işlemi işleme alındı.'};
  }
}
