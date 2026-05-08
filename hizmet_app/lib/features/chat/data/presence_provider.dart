import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'chat_repository.dart';
import 'chat_service.dart';

/// Phase 78: in-memory map of userId → PresenceState, hydrated by WebSocket
/// `presence` events and (lazily) by HTTP `/chat/presence/:id`.
class PresenceNotifier extends StateNotifier<Map<String, PresenceState>> {
  PresenceNotifier(this._repo, ChatService chatService)
      : super(const <String, PresenceState>{}) {
    chatService.onPresence((userId, isOnline, lastSeenAt) {
      if (userId.isEmpty) return;
      state = {
        ...state,
        userId: PresenceState(
          userId: userId,
          isOnline: isOnline,
          lastSeenAt: lastSeenAt ?? state[userId]?.lastSeenAt,
        ),
      };
    });
  }

  final ChatRepository _repo;

  /// Hydrate one user from REST if not yet known.
  Future<void> ensure(String userId) async {
    if (state.containsKey(userId)) return;
    final p = await _repo.getPresence(userId);
    if (p == null) return;
    state = {...state, userId: p};
  }

  /// Hydrate from a list of conversations (server-side initial state).
  void seedFromConversations(List<Conversation> convos) {
    if (convos.isEmpty) return;
    final next = Map<String, PresenceState>.from(state);
    for (final c in convos) {
      next[c.peerId] = PresenceState(
        userId: c.peerId,
        isOnline: c.peerOnline,
        lastSeenAt: c.peerLastSeenAt,
      );
    }
    state = next;
  }
}

final presenceProvider =
    StateNotifierProvider<PresenceNotifier, Map<String, PresenceState>>((ref) {
  return PresenceNotifier(
    ref.read(chatRepositoryProvider),
    ref.read(chatServiceProvider),
  );
});

/// Family selector — returns presence state for a given user (nullable).
final peerPresenceProvider =
    Provider.family<PresenceState?, String>((ref, userId) {
  return ref.watch(presenceProvider)[userId];
});

/// Format "last seen" relative time in Turkish.
String formatLastSeen(DateTime? lastSeenAt) {
  if (lastSeenAt == null) return 'Çevrimdışı';
  final now = DateTime.now();
  final diff = now.difference(lastSeenAt);
  if (diff.inSeconds < 60) return 'Son görülme: şimdi';
  if (diff.inMinutes < 60) {
    return 'Son görülme: ${diff.inMinutes} dk önce';
  }
  if (diff.inHours < 24) {
    final today = DateTime(now.year, now.month, now.day);
    final lsDay = DateTime(lastSeenAt.year, lastSeenAt.month, lastSeenAt.day);
    if (lsDay == today) {
      final hh = lastSeenAt.hour.toString().padLeft(2, '0');
      final mm = lastSeenAt.minute.toString().padLeft(2, '0');
      return 'Son görülme: bugün $hh:$mm';
    }
    return 'Son görülme: ${diff.inHours} saat önce';
  }
  if (diff.inDays == 1) {
    final hh = lastSeenAt.hour.toString().padLeft(2, '0');
    final mm = lastSeenAt.minute.toString().padLeft(2, '0');
    return 'Son görülme: dün $hh:$mm';
  }
  if (diff.inDays < 7) return 'Son görülme: ${diff.inDays} gün önce';
  return 'Son görülme: ${lastSeenAt.day}.${lastSeenAt.month}.${lastSeenAt.year}';
}
