import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

/// Phase 143 — Category+City job alert subscription model.
class CategorySubscription {
  final String id;
  final String category;
  final String? city;
  final bool alertEnabled;
  final DateTime? createdAt;

  CategorySubscription({
    required this.id,
    required this.category,
    this.city,
    required this.alertEnabled,
    this.createdAt,
  });

  factory CategorySubscription.fromJson(Map<String, dynamic> j) {
    return CategorySubscription(
      id: j['id'] as String,
      category: j['category'] as String,
      city: j['city'] as String?,
      alertEnabled: (j['alertEnabled'] as bool?) ?? true,
      createdAt: j['createdAt'] != null
          ? DateTime.tryParse(j['createdAt'].toString())
          : null,
    );
  }
}

final categorySubscriptionRepositoryProvider =
    Provider((ref) => CategorySubscriptionRepository(
          dio: ref.read(apiClientProvider).dio,
        ));

final categorySubscriptionsProvider =
    FutureProvider<List<CategorySubscription>>((ref) async {
  return ref.watch(categorySubscriptionRepositoryProvider).getMine();
});

class CategorySubscriptionRepository {
  final Dio _dio;

  CategorySubscriptionRepository({required Dio dio}) : _dio = dio;

  Future<List<CategorySubscription>> getMine() async {
    final res = await _dio.get('/subscriptions/category');
    final list = (res.data as List).cast<Map<String, dynamic>>();
    return list.map(CategorySubscription.fromJson).toList();
  }

  Future<CategorySubscription> subscribe(String category, {String? city}) async {
    final res = await _dio.post(
      '/subscriptions/category',
      data: {
        'category': category,
        if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
      },
    );
    return CategorySubscription.fromJson(
        Map<String, dynamic>.from(res.data as Map));
  }

  Future<void> unsubscribe(String id) async {
    await _dio.delete('/subscriptions/category/$id');
  }
}
