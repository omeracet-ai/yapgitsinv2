import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../../core/constants/api_constants.dart';

final chatServiceProvider = Provider((ref) => ChatService());

class ChatService {
  late IO.Socket socket;

  void connect() {
    socket = IO.io(ApiConstants.baseUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .build()
    );

    socket.onConnect((_) => debugPrint('Connected to socket.io'));
    socket.onDisconnect((_) => debugPrint('Disconnected from socket.io'));
  }

  void sendMessage(String to, String from, String message) {
    socket.emit('sendMessage', {
      'to': to,
      'from': from,
      'message': message,
    });
  }

  void onMessageReceived(Function(Map<String, dynamic>) callback) {
    socket.on('receiveMessage', (data) => callback(Map<String, dynamic>.from(data)));
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
  void onUserTyping(Function(String userId, bool isTyping) callback) {
    socket.on('userTyping', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      callback(
        (map['userId'] as String?) ?? '',
        (map['isTyping'] as bool?) ?? false,
      );
    });
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
  void onMessagesRead(
      Function(List<String> messageIds, DateTime readAt) callback) {
    socket.on('messagesRead', (data) {
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
    });
  }

  /// Phase 77: subscribe to server-side message-filter notices (e.g. contact-block).
  /// Callback receives (reason, detectedTypes).
  void onMessageFiltered(
      Function(String reason, List<String> detectedTypes) callback) {
    socket.on('messageFiltered', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final reason = (map['reason'] as String?) ?? 'unknown';
      final types = (map['detectedTypes'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>[];
      callback(reason, types);
    });
  }

  /// Phase 78: subscribe to peer presence broadcasts.
  /// Callback receives (userId, isOnline, lastSeenAt?).
  void onPresence(
      Function(String userId, bool isOnline, DateTime? lastSeenAt) callback) {
    socket.on('presence', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final uid = (map['userId'] as String?) ?? '';
      final online = (map['isOnline'] as bool?) ?? false;
      final lsStr = map['lastSeenAt'] as String?;
      final ls = lsStr != null ? DateTime.tryParse(lsStr) : null;
      callback(uid, online, ls);
    });
  }

  void disconnect() {
    socket.disconnect();
  }
}
