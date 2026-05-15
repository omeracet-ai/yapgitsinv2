import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'firebase_favorites_repository.dart';

/// Holds the set of favorited workerIds for the current user.
/// Loaded lazily from the favorites list on first read; updated optimistically
/// by [toggle] which also calls the backend.
class FavoritesNotifier extends StateNotifier<Set<String>> {
  final FirebaseFavoritesRepository _repo;
  bool _loaded = false;

  FavoritesNotifier(this._repo) : super(<String>{});

  bool isFavorited(String workerId) => state.contains(workerId);

  Future<void> loadIfNeeded() async {
    if (_loaded) return;
    try {
      final list = await _repo.getMyFavorites();
      state = list
          .map((w) => w['id']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toSet();
      _loaded = true;
    } catch (e, st) {
      debugPrint('favorites_provider.loadIfNeeded: $e\n$st');
    }
  }

  /// Optimistic toggle. Returns the new favorited state.
  Future<bool> toggle(String workerId) async {
    final wasFav = state.contains(workerId);
    // optimistic update
    state = wasFav
        ? (state.toSet()..remove(workerId))
        : (state.toSet()..add(workerId));
    try {
      final favorited = wasFav
          ? await _repo.removeFavorite(workerId)
          : await _repo.toggleFavorite(workerId);
      // sync with server response
      state = favorited
          ? (state.toSet()..add(workerId))
          : (state.toSet()..remove(workerId));
      return favorited;
    } catch (e) {
      // rollback
      state = wasFav
          ? (state.toSet()..add(workerId))
          : (state.toSet()..remove(workerId));
      rethrow;
    }
  }

  void invalidate() {
    _loaded = false;
  }

  /// Replace the entire id-set (used when full favorites list is fetched).
  void setIds(Set<String> ids) {
    state = ids;
    _loaded = true;
  }
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, Set<String>>((ref) {
  return FavoritesNotifier(ref.watch(firebaseFavoritesRepositoryProvider));
});

/// Full favorite worker objects — list view.
final myFavoritesListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(firebaseFavoritesRepositoryProvider);
  final list = await repo.getMyFavorites();
  // also seed the id-set notifier so heart icons across app stay in sync
  Future.microtask(() {
    ref.read(favoritesProvider.notifier).setIds(list
        .map((w) => w['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet());
  });
  return list;
});
