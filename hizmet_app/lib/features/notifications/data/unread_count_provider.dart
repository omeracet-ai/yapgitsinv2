import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
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
      if (mounted) state = count;
    } catch (_) {
      // Silent fail — keep last known count.
    }
  }

  void decrement() {
    if (!mounted) return;
    if (state > 0) state = state - 1;
  }

  void reset() {
    if (!mounted) return;
    state = 0;
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
