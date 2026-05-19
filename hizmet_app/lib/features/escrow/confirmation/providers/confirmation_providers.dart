import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/confirmation_repository.dart';
import '../data/confirmation_state.dart';

/// Phase 254 — Confirmation state polling notifier.
///
/// Backend webhook'u yerine her 15sn /state endpoint'ini çeker. UI bu state'i
/// dinler ve step ekranını ona göre render eder.
class ConfirmationStateNotifier
    extends StateNotifier<AsyncValue<ConfirmationState>> {
  final String escrowId;
  final ConfirmationRepository _repo;
  Timer? _timer;

  ConfirmationStateNotifier(this.escrowId, this._repo)
      : super(const AsyncValue.loading()) {
    refresh();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => refresh(silent: true));
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent) state = const AsyncValue.loading();
    try {
      final s = await _repo.getState(escrowId);
      if (!mounted) return;
      state = AsyncValue.data(s);
    } catch (e, st) {
      if (!mounted) return;
      // Silent polling errors logged, state'i bozma.
      if (silent && state is AsyncData<ConfirmationState>) {
        debugPrint('confirmation poll error: $e');
        return;
      }
      state = AsyncValue.error(e, st);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final confirmationStateProvider = StateNotifierProvider.autoDispose
    .family<ConfirmationStateNotifier, AsyncValue<ConfirmationState>, String>(
  (ref, escrowId) {
    return ConfirmationStateNotifier(
      escrowId,
      ref.watch(confirmationRepositoryProvider),
    );
  },
);

/// Current user'ın confirmation'daki tarafı (worker | customer).
/// Escrow.workerId / customerId ile authState uid'sini karşılaştırır.
class ConfirmationSideResolver {
  static String? resolve({
    required String? currentUserId,
    required String? workerId,
    required String? customerId,
  }) {
    if (currentUserId == null) return null;
    if (currentUserId == workerId) return 'worker';
    if (currentUserId == customerId) return 'customer';
    return null;
  }
}
