import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/in_app_notification_service.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/providers/auth_provider.dart';

/// Global, non-autoDispose unread count cache for the bottom-nav badge.
/// Polls every 45s while authenticated; manual refresh()/decrement()/reset().
final unreadCountBadgeProvider =
    StateNotifierProvider<UnreadCountNotifier, int>((ref) {
  final notifier = UnreadCountNotifier(ref);
  // React to auth changes: login -> refresh, logout -> reset.
  ref.listen<AuthState>(authStateProvider, (prev, next) {
    if (next is AuthAuthenticated) {
      notifier.refresh();
      notifier.startPolling();
    } else if (next is AuthUnauthenticated) {
      notifier.reset();
      notifier.stopPolling();
    }
  }, fireImmediately: true);
  return notifier;
});

class UnreadCountNotifier extends StateNotifier<int> {
  UnreadCountNotifier(this._ref) : super(0);

  final Ref _ref;
  Timer? _timer;
  // Phase 79 — track previous unread count to detect new arrivals; null on
  // first fetch so we don't fire a toast for already-pending notifications.
  int? _lastSeenCount;
  // Latest notification metadata used for the toast preview.
  Map<String, dynamic>? _latestNotif;

  Future<void> refresh() async {
    final authRepo = _ref.read(authRepositoryProvider);
    final token = await authRepo.getToken();
    if (token == null) {
      if (mounted) state = 0;
      return;
    }
    try {
      final dio = Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 6),
      ));
      final res = await dio.get(
        '/notifications/unread-count',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final count = (res.data['count'] as num?)?.toInt() ?? 0;
      // Phase 79 — when the count grows past what we last saw, fetch the
      // newest notification preview and surface it as a slide-in toast.
      if (_lastSeenCount != null && count > _lastSeenCount!) {
        await _maybeShowToast(dio, token);
      }
      _lastSeenCount = count;
      if (mounted) state = count;
    } catch (e, st) {
      debugPrint('unread_count_provider.refresh: $e\n$st');
    }
  }

  Future<void> _maybeShowToast(Dio dio, String token) async {
    try {
      final res = await dio.get(
        '/notifications',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final list = List<Map<String, dynamic>>.from(res.data as List);
      if (list.isEmpty) return;
      final newest = list.first;
      // Skip duplicate toast for the same notif id between polls.
      if (_latestNotif != null && _latestNotif!['id'] == newest['id']) {
        return;
      }
      _latestNotif = newest;
      InAppNotificationService.instance.show(
        title: (newest['title'] as String?) ?? 'Yeni bildirim',
        message: (newest['body'] as String?) ?? '',
        type: newest['type'] as String?,
      );
    } catch (_) {
      // Fallback: generic toast if the list fetch fails.
      InAppNotificationService.instance.show(
        title: 'Yeni bildirim',
        message: 'Bildirimler sekmesinden inceleyebilirsin.',
      );
    }
  }

  void decrement() {
    if (!mounted) return;
    if (state > 0) state = state - 1;
  }

  void reset() {
    if (!mounted) return;
    state = 0;
    _lastSeenCount = null;
    _latestNotif = null;
  }

  void startPolling() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => refresh());
  }

  void stopPolling() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
