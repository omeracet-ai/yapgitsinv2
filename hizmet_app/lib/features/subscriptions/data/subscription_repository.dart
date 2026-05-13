import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client_provider.dart';
import '../../auth/data/auth_repository.dart';

/// Phase 188 — subscribe() response shape.
class SubscribeResult {
  final String subscriptionId;
  final String paymentUrl;
  final String paymentToken;
  final bool mock;
  SubscribeResult({
    required this.subscriptionId,
    required this.paymentUrl,
    required this.paymentToken,
    required this.mock,
  });
  factory SubscribeResult.fromJson(Map<String, dynamic> j) => SubscribeResult(
        subscriptionId: (j['subscriptionId'] as String?) ?? '',
        paymentUrl: (j['paymentUrl'] as String?) ?? '',
        paymentToken: (j['paymentToken'] as String?) ?? '',
        mock: (j['mock'] as bool?) ?? false,
      );
}

class SubscriptionPlan {
  final String key;
  final String name;
  final double price;
  final String period;
  final List<String> features;

  SubscriptionPlan({
    required this.key,
    required this.name,
    required this.price,
    required this.period,
    required this.features,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> j) {
    return SubscriptionPlan(
      key: j['key'] as String,
      name: j['name'] as String,
      price: ((j['price'] as num?) ?? 0).toDouble(),
      period: (j['period'] as String?) ?? 'monthly',
      features: List<String>.from((j['features'] as List?) ?? const []),
    );
  }
}

class UserSubscription {
  final SubscriptionPlan plan;
  final String status;
  final DateTime? startedAt;
  final DateTime? expiresAt;
  final DateTime? cancelledAt;

  UserSubscription({
    required this.plan,
    required this.status,
    this.startedAt,
    this.expiresAt,
    this.cancelledAt,
  });

  bool get isActive => status == 'active';

  factory UserSubscription.fromJson(Map<String, dynamic> j) {
    return UserSubscription(
      plan: SubscriptionPlan.fromJson(Map<String, dynamic>.from(j['plan'] as Map)),
      status: j['status'] as String,
      startedAt: j['startedAt'] != null ? DateTime.tryParse(j['startedAt'] as String) : null,
      expiresAt: j['expiresAt'] != null ? DateTime.tryParse(j['expiresAt'] as String) : null,
      cancelledAt: j['cancelledAt'] != null ? DateTime.tryParse(j['cancelledAt'] as String) : null,
    );
  }
}

final subscriptionRepositoryProvider = Provider((ref) {
  return SubscriptionRepository(
    ref.watch(authRepositoryProvider),
    ref.watch(apiClientProvider).dio,
  );
});

final subscriptionPlansProvider = FutureProvider<List<SubscriptionPlan>>((ref) async {
  return ref.watch(subscriptionRepositoryProvider).getPlans();
});

final mySubscriptionProvider = FutureProvider<UserSubscription?>((ref) async {
  return ref.watch(subscriptionRepositoryProvider).getMySubscription();
});

class SubscriptionRepository {
  final AuthRepository _auth;
  final Dio _dio;
  // Legacy dio kept for getPlans/getMySubscription/cancel (manual Bearer).
  // The Bearer-injecting apiClientProvider Dio is used for subscribe/confirm
  // per P188/4 (Phase 188).
  final Dio _legacyDio;

  SubscriptionRepository(this._auth, this._dio)
      : _legacyDio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<List<SubscriptionPlan>> getPlans() async {
    final res = await _legacyDio.get('/subscriptions/plans', options: await _authOpts());
    final list = (res.data as List).cast<Map<String, dynamic>>();
    return list.map(SubscriptionPlan.fromJson).toList();
  }

  Future<UserSubscription?> getMySubscription() async {
    final res = await _legacyDio.get('/subscriptions/my', options: await _authOpts());
    if (res.data == null) return null;
    return UserSubscription.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// Phase 188 — start iyzipay Checkout Form, return URL + token for WebView.
  Future<SubscribeResult> subscribe(String planKey) async {
    final res = await _dio.post(
      '/subscriptions/subscribe',
      data: {'planKey': planKey},
    );
    return SubscribeResult.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// Phase 188 — confirm iyzipay payment by token after WebView callback.
  Future<Map<String, dynamic>> confirm(String token) async {
    final res = await _dio.post(
      '/subscriptions/confirm',
      data: {'token': token},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> cancel() async {
    final res = await _legacyDio.post('/subscriptions/cancel', options: await _authOpts());
    return Map<String, dynamic>.from(res.data as Map);
  }
}
