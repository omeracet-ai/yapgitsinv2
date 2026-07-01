import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../../core/constants/api_constants.dart';

final chatServiceProvider = Provider((ref) => ChatService());

class ChatService {
  late IO.Socket socket;

  /// Phase 508 — connect now accepts the authenticated user id and sends it
  /// via socket.io handshake.auth so the backend gateway can wire presence
  /// (`extractUserId` reads `auth.userId`). Re-using the same socket instance
  /// across re-entries prevents connection thrashing when the chat screen
  /// re-mounts.
  bool _connected = false;
  String? _connectedUserId;

  void connect({String? userId}) {
    if (_connected && socket.connected && _connectedUserId == userId) {
      return;
    }
    // Always drop the previous socket before creating a new one — otherwise
    // listeners bound to the orphaned instance go silent after reconnect.
    if (_connected) {
      try { socket.dispose(); } catch (_) {}
      _connected = false;
    }
    socket = IO.io(
      ApiConstants.baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth(userId != null ? {'userId': userId} : {})
          .build(),
    );
    _connected = true;
    _connectedUserId = userId;

    socket.onConnect((_) => debugPrint('Connected to socket.io as ${userId ?? 'anon'}'));
    socket.onDisconnect((_) {
      _connected = false;
      debugPrint('Disconnected from socket.io');
    });
  }

  Future<bool> sendMessage(
    String to,
    String from,
    String message, {
    String? attachmentUrl,
    String? attachmentType, // 'image' | 'document' | 'audio'
    String? attachmentName,
    int? attachmentSize,
    int? attachmentDuration,
    String? clientTempId,
  }) {
    final payload = <String, dynamic>{
      'to': to,
      'from': from,
      'message': message,
    };
    if (clientTempId != null) {
      payload['clientTempId'] = clientTempId;
    }
    if (attachmentUrl != null) {
      payload['attachmentUrl'] = attachmentUrl;
      payload['attachmentType'] = attachmentType;
      payload['attachmentName'] = attachmentName;
      payload['attachmentSize'] = attachmentSize;
      if (attachmentDuration != null) {
        payload['attachmentDuration'] = attachmentDuration;
      }
    }
    // Bug9 — fire with ack + 10s timeout so callers can mark the optimistic
    // bubble as failed on disconnect / backend gate rejection instead of
    // leaving it visible forever. Socket disconnected → immediate false.
    if (!socket.connected) {
      return Future.value(false);
    }
    final completer = Completer<bool>();
    Timer? timer;
    timer = Timer(const Duration(seconds: 10), () {
      if (!completer.isCompleted) completer.complete(false);
    });
    try {
      socket.emitWithAck('sendMessage', payload, ack: (dynamic _) {
        timer?.cancel();
        if (!completer.isCompleted) completer.complete(true);
      });
    } catch (_) {
      timer.cancel();
      if (!completer.isCompleted) completer.complete(false);
    }
    return completer.future;
  }

  VoidCallback onMessageReceived(Function(Map<String, dynamic>) callback) {
    void handler(dynamic data) => callback(Map<String, dynamic>.from(data));
    socket.on('receiveMessage', handler);
    return () => socket.off('receiveMessage', handler);
  }

  void joinRoom(String roomId) {
    socket.emit('joinRoom', roomId);
  }

  /// Phase 67: emit a typing event to peers in the room.
  void emitTyping(String roomId, String userId, bool isTyping) {
    socket.emit('typing', {
      'roomId': roomId,
      'userId': userId,
      'isTyping': isTyping,
    });
  }

  /// Phase 67: subscribe to peer typing events.
  /// Callback receives (userId, isTyping).
  VoidCallback onUserTyping(Function(String userId, bool isTyping) callback) {
    void handler(dynamic data) {
      final map = Map<String, dynamic>.from(data as Map);
      callback(
        (map['userId'] as String?) ?? '',
        (map['isTyping'] as bool?) ?? false,
      );
    }
    socket.on('userTyping', handler);
    return () => socket.off('userTyping', handler);
  }

  /// Phase 68: emit read-receipt for a batch of message ids.
  void markRead(String roomId, List<String> messageIds) {
    if (messageIds.isEmpty) return;
    socket.emit('markRead', {
      'roomId': roomId,
      'messageIds': messageIds,
    });
  }

  /// Phase 68: subscribe to peer read-receipt broadcasts.
  /// Callback receives (messageIds, readAt).
  VoidCallback onMessagesRead(
      Function(List<String> messageIds, DateTime readAt) callback) {
    void handler(dynamic data) {
      final map = Map<String, dynamic>.from(data as Map);
      final ids = (map['messageIds'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>[];
      final readAtStr = map['readAt'] as String?;
      final readAt = readAtStr != null
          ? DateTime.tryParse(readAtStr) ?? DateTime.now()
          : DateTime.now();
      callback(ids, readAt);
    }
    socket.on('messagesRead', handler);
    return () => socket.off('messagesRead', handler);
  }

  /// Phase 77: subscribe to server-side message-filter notices (e.g. contact-block).
  /// Callback receives (reason, detectedTypes).
  VoidCallback onMessageFiltered(
      Function(String reason, List<String> detectedTypes) callback) {
    void handler(dynamic data) {
      final map = Map<String, dynamic>.from(data as Map);
      final reason = (map['reason'] as String?) ?? 'unknown';
      final types = (map['detectedTypes'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>[];
      callback(reason, types);
    }
    socket.on('messageFiltered', handler);
    return () => socket.off('messageFiltered', handler);
  }

  /// Phase 78: subscribe to peer presence broadcasts.
  /// Callback receives (userId, isOnline, lastSeenAt?).
  VoidCallback onPresence(
      Function(String userId, bool isOnline, DateTime? lastSeenAt) callback) {
    void handler(dynamic data) {
      final map = Map<String, dynamic>.from(data as Map);
      final uid = (map['userId'] as String?) ?? '';
      final online = (map['isOnline'] as bool?) ?? false;
      final lsStr = map['lastSeenAt'] as String?;
      final ls = lsStr != null ? DateTime.tryParse(lsStr) : null;
      callback(uid, online, ls);
    }
    socket.on('presence', handler);
    return () => socket.off('presence', handler);
  }

  /// Phase 508 — backend gateway `_client.emit('error', { type, message })`
  /// gönderdiğinde (örn. `owner_must_initiate`, `no_accepted_offer`, `blocked`)
  /// frontend kullanıcısına net snackbar göstermek için subscription.
  VoidCallback onServerError(Function(String type, String message) callback) {
    void handler(dynamic data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        callback(
          (map['type'] as String?) ?? 'unknown',
          (map['message'] as String?) ?? 'Bir hata oluştu',
        );
      } catch (_) {
        // ignore malformed payload
      }
    }
    socket.on('error', handler);
    return () => socket.off('error', handler);
  }

  /// Bug8 — subscribe to server-emitted `chatHistory` (list of ChatMessage rows).
  VoidCallback onChatHistory(Function(List<dynamic> rows) callback) {
    void handler(dynamic data) {
      final list = (data is List) ? data : const <dynamic>[];
      callback(list);
    }
    socket.on('chatHistory', handler);
    return () => socket.off('chatHistory', handler);
  }

  /// Bug8 — request DM history between me and peer (backend replies `chatHistory`).
  void requestHistory({required String userId, required String peerId, int limit = 100}) {
    socket.emit('getHistory', {
      'userId': userId,
      'peerId': peerId,
      'limit': limit,
    });
  }

  void disconnect() {
    socket.disconnect();
    _connected = false;
    _connectedUserId = null;
  }
}
