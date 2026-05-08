import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/chat/data/chat_service.dart';
import 'in_app_notification_service.dart';

/// Phase 80 — Real-time chat → toast hook.
///
/// Bridges WebSocket [ChatService.onMessageReceived] to the global
/// [InAppNotificationService] banner. Suppresses the toast if the user is
/// already viewing the conversation with the sender (tracked via
/// [activeChatPeerId]).
///
/// Bound exactly once per app lifetime (idempotent).
class ChatToastHook {
  ChatToastHook._();
  static final ChatToastHook instance = ChatToastHook._();

  /// Active chat detail screen sets this to the peerId it's showing; clears
  /// to null on dispose. When non-null and equal to incoming `from`, no toast.
  static String? activeChatPeerId;

  bool _bound = false;

  /// Wire the chat socket listener to the toast service.
  /// Idempotent — additional calls are no-ops.
  void bind(Ref ref) {
    if (_bound) return;
    final chatService = ref.read(chatServiceProvider);
    // Make sure the socket is up before attaching the listener; the chat
    // screens also call connect() defensively.
    chatService.connect();
    chatService.onMessageReceived(_handleMessage);
    _bound = true;
    debugPrint('[ChatToastHook] bound onMessageReceived listener');
  }

  void _handleMessage(Map<String, dynamic> data) {
    final from = (data['from'] as String?) ?? '';
    final message = (data['message'] as String?) ?? '';
    if (from.isEmpty || from == 'me') return;

    // Suppress toast when user is already chatting with this peer.
    if (activeChatPeerId != null && activeChatPeerId == from) return;

    final senderName = (data['fromName'] as String?) ?? 'Yeni mesaj';
    final preview = message.length > 80 ? '${message.substring(0, 77)}…' : message;

    InAppNotificationService.instance.show(
      title: 'Yeni mesaj — $senderName',
      message: preview,
      type: 'new_message',
    );
  }
}

/// Provider that binds the hook the moment auth flips to Authenticated.
/// `fireImmediately: true` covers the case where the app boots already
/// authenticated (token in SharedPreferences).
final chatToastHookProvider = Provider<ChatToastHook>((ref) {
  final hook = ChatToastHook.instance;
  ref.listen<AuthState>(authStateProvider, (prev, next) {
    if (next is AuthAuthenticated) {
      hook.bind(ref);
    }
  }, fireImmediately: true);
  return hook;
});
