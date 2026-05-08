import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'saved_jobs_repository.dart';

/// Holds the set of saved jobIds for the current user.
class SavedJobsNotifier extends StateNotifier<Set<String>> {
  final SavedJobsRepository _repo;
  bool _loaded = false;

  SavedJobsNotifier(this._repo) : super(<String>{});

  bool isSaved(String jobId) => state.contains(jobId);

  Future<void> loadIfNeeded() async {
    if (_loaded) return;
    try {
      final list = await _repo.getMySavedJobs();
      state = list
          .map((j) => j['id']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toSet();
      _loaded = true;
    } catch (_) {
      // silent
    }
  }

  /// Optimistic toggle. Returns the new saved state.
  Future<bool> toggle(String jobId) async {
    final wasSaved = state.contains(jobId);
    state = wasSaved
        ? (state.toSet()..remove(jobId))
        : (state.toSet()..add(jobId));
    try {
      final saved = wasSaved
          ? await _repo.unsaveJob(jobId)
          : await _repo.saveJob(jobId);
      state = saved
          ? (state.toSet()..add(jobId))
          : (state.toSet()..remove(jobId));
      return saved;
    } catch (e) {
      // rollback
      state = wasSaved
          ? (state.toSet()..add(jobId))
          : (state.toSet()..remove(jobId));
      rethrow;
    }
  }

  void invalidate() {
    _loaded = false;
  }

  void setIds(Set<String> ids) {
    state = ids;
    _loaded = true;
  }
}

final savedJobsProvider =
    StateNotifierProvider<SavedJobsNotifier, Set<String>>((ref) {
  return SavedJobsNotifier(ref.watch(savedJobsRepositoryProvider));
});

/// Full saved-job objects — list view.
final mySavedJobsListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(savedJobsRepositoryProvider);
  final list = await repo.getMySavedJobs();
  Future.microtask(() {
    ref.read(savedJobsProvider.notifier).setIds(list
        .map((j) => j['id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet());
  });
  return list;
});
