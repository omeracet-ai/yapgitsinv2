import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'notification_prefs_repository.dart';

class NotificationPrefsState {
  const NotificationPrefsState({
    required this.prefs,
    this.loading = false,
    this.saving = false,
    this.error,
  });

  final NotificationPrefs prefs;
  final bool loading;
  final bool saving;
  final String? error;

  NotificationPrefsState copyWith({
    NotificationPrefs? prefs,
    bool? loading,
    bool? saving,
    String? error,
    bool clearError = false,
  }) =>
      NotificationPrefsState(
        prefs: prefs ?? this.prefs,
        loading: loading ?? this.loading,
        saving: saving ?? this.saving,
        error: clearError ? null : (error ?? this.error),
      );
}

class NotificationPrefsNotifier extends StateNotifier<NotificationPrefsState> {
  NotificationPrefsNotifier(this._ref)
      : super(NotificationPrefsState(prefs: allEnabledPrefs(), loading: true)) {
    load();
  }

  final Ref _ref;

  Future<void> load() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final prefs =
          await _ref.read(notificationPrefsRepositoryProvider).fetch();
      state = NotificationPrefsState(prefs: prefs);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> setKey(String key, bool value) async {
    final next = {...state.prefs, key: value};
    state = state.copyWith(prefs: next, saving: true, clearError: true);
    await _persist(next);
  }

  Future<void> setAll(bool value) async {
    final next = {for (final k in kNotificationPrefKeys) k: value};
    state = state.copyWith(prefs: next, saving: true, clearError: true);
    await _persist(next);
  }

  Future<void> _persist(NotificationPrefs prefs) async {
    try {
      final saved =
          await _ref.read(notificationPrefsRepositoryProvider).update(prefs);
      state = NotificationPrefsState(prefs: saved);
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
    }
  }
}

final notificationPrefsProvider = StateNotifierProvider.autoDispose<
    NotificationPrefsNotifier,
    NotificationPrefsState>((ref) => NotificationPrefsNotifier(ref));
