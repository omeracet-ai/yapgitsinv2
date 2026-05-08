import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'moderation_repository.dart';

/// Cache of blocked userIds for the current session.
class BlockedUsersNotifier extends StateNotifier<Set<String>> {
  final ModerationRepository _repo;
  bool _loaded = false;

  BlockedUsersNotifier(this._repo) : super(<String>{});

  bool isBlocked(String userId) => state.contains(userId);

  Future<void> loadIfNeeded() async {
    if (_loaded) return;
    try {
      final list = await _repo.getBlocks();
      state = list
          .map((b) => (b['blockedId'] ?? b['blockedUser']?['id'] ?? '')
              .toString())
          .where((id) => id.isNotEmpty)
          .toSet();
      _loaded = true;
    } catch (_) {
      // empty set is a safe default
    }
  }

  Future<bool> block(String userId) async {
    final blocked = await _repo.blockUser(userId);
    state = blocked
        ? (state.toSet()..add(userId))
        : (state.toSet()..remove(userId));
    _loaded = true;
    return blocked;
  }

  Future<bool> unblock(String userId) async {
    final blocked = await _repo.unblockUser(userId);
    state = blocked
        ? (state.toSet()..add(userId))
        : (state.toSet()..remove(userId));
    _loaded = true;
    return blocked;
  }

  void invalidate() {
    _loaded = false;
  }

  void setIds(Set<String> ids) {
    state = ids;
    _loaded = true;
  }
}

final blockedUsersProvider =
    StateNotifierProvider<BlockedUsersNotifier, Set<String>>((ref) {
  return BlockedUsersNotifier(ref.watch(moderationRepositoryProvider));
});

/// Full block records — list view.
final myBlocksListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(moderationRepositoryProvider);
  final list = await repo.getBlocks();
  Future.microtask(() {
    ref.read(blockedUsersProvider.notifier).setIds(list
        .map((b) =>
            (b['blockedId'] ?? b['blockedUser']?['id'] ?? '').toString())
        .where((id) => id.isNotEmpty)
        .toSet());
  });
  return list;
});
