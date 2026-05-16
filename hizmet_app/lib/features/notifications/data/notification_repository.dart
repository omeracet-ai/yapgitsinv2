import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

/// Phase 249 — NotificationRepository wraps the /notifications endpoints
/// exposed by NotificationsController (all guarded by JWT). Centralizes
/// HTTP so screens don't construct raw Dio instances or hand-attach
/// Authorization headers.
final notificationRepositoryProvider =
    Provider<NotificationRepository>((ref) {
  return NotificationRepository(dio: ref.read(apiClientProvider).dio);
});

class NotificationRepository {
  final Dio _dio;

  NotificationRepository({required Dio dio}) : _dio = dio;

  /// GET /notifications — full list for current user.
  /// Backend currently returns all items (no pagination). [page]/[limit] are
  /// accepted for forward-compatibility; sent as query params if provided.
  Future<List<Map<String, dynamic>>> list({int? page, int? limit}) async {
    final query = <String, dynamic>{};
    if (page != null) query['page'] = page;
    if (limit != null) query['limit'] = limit;
    final res = await _dio.get(
      '/notifications',
      queryParameters: query.isEmpty ? null : query,
    );
    final raw = res.data;
    if (raw is! List) return const [];
    return raw
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList(growable: false);
  }

  /// GET /notifications/unread-count → { count: number }.
  Future<int> unreadCount() async {
    final res = await _dio.get('/notifications/unread-count');
    final data = res.data;
    if (data is Map) {
      return (data['count'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  /// PATCH /notifications/read-all — bulk mark as read.
  Future<void> markAllRead() async {
    await _dio.patch('/notifications/read-all');
  }

  /// PATCH /notifications/:id/read — single mark as read.
  Future<void> markRead(String id) async {
    await _dio.patch('/notifications/$id/read');
  }
}
