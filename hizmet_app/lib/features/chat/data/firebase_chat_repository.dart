import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseChatRepositoryProvider = Provider<FirebaseChatRepository>((ref) {
  return FirebaseChatRepository(FirestoreService.instance);
});

// ─── Models ──────────────────────────────────────────────────────────────────

class Conversation {
  final String chatId;
  final String peerId;
  final String? peerName;
  final String? peerAvatarUrl;
  final String lastMessageText;
  final DateTime lastMessageAt;
  final bool lastFromMe;
  final int unreadCount;

  const Conversation({
    required this.chatId,
    required this.peerId,
    this.peerName,
    this.peerAvatarUrl,
    required this.lastMessageText,
    required this.lastMessageAt,
    required this.lastFromMe,
    required this.unreadCount,
  });

  factory Conversation.fromFirestore(Map<String, dynamic> data, String myUid) {
    final participants = List<String>.from(data['participantIds'] as List? ?? []);
    final peerId = participants.firstWhere(
      (id) => id != myUid,
      orElse: () => '',
    );
    final lastMsg = data['lastMessage'] as Map<String, dynamic>? ?? {};
    final updatedAt = (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now();
    return Conversation(
      chatId: data['id'] as String? ?? '',
      peerId: peerId,
      peerName: data['peerName_$peerId'] as String?,
      peerAvatarUrl: data['peerAvatar_$peerId'] as String?,
      lastMessageText: (lastMsg['text'] as String?) ?? '',
      lastMessageAt: (lastMsg['createdAt'] as Timestamp?)?.toDate() ?? updatedAt,
      lastFromMe: (lastMsg['senderId'] as String?) == myUid,
      unreadCount: (data['unreadCount_$myUid'] as num?)?.toInt() ?? 0,
    );
  }
}

class ChatMessage {
  final String id;
  final String senderId;
  final String text;
  final DateTime createdAt;
  final bool read;
  final String? attachmentUrl;
  final String? attachmentType;
  final String? attachmentName;
  final int? attachmentSize;
  final int? attachmentDuration;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.text,
    required this.createdAt,
    required this.read,
    this.attachmentUrl,
    this.attachmentType,
    this.attachmentName,
    this.attachmentSize,
    this.attachmentDuration,
  });

  factory ChatMessage.fromFirestore(Map<String, dynamic> data) {
    return ChatMessage(
      id: data['id'] as String? ?? '',
      senderId: data['senderId'] as String? ?? '',
      text: data['text'] as String? ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      read: (data['read'] as bool?) ?? false,
      attachmentUrl: data['attachmentUrl'] as String?,
      attachmentType: data['attachmentType'] as String?,
      attachmentName: data['attachmentName'] as String?,
      attachmentSize: (data['attachmentSize'] as num?)?.toInt(),
      attachmentDuration: (data['attachmentDuration'] as num?)?.toInt(),
    );
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

class FirebaseChatRepository {
  FirebaseChatRepository(this._fs);
  final FirestoreService _fs;

  String? get _myUid => _fs.uid;

  /// Real-time stream of conversations where current user is a participant.
  Stream<List<Conversation>> getConversations() {
    final uid = _myUid;
    if (uid == null) return const Stream.empty();

    final q = _fs
        .col('chats')
        .where('participantIds', arrayContains: uid)
        .orderBy('updatedAt', descending: true);

    return q.snapshots().map((snap) => snap.docs
        .map((d) => Conversation.fromFirestore({'id': d.id, ...d.data()}, uid))
        .toList());
  }

  /// Real-time stream of messages for a chat, ordered oldest→newest.
  Stream<List<ChatMessage>> getMessages(String chatId) {
    final q = _fs
        .col('chats/$chatId/messages')
        .orderBy('createdAt');

    return q.snapshots().map((snap) => snap.docs
        .map((d) => ChatMessage.fromFirestore({'id': d.id, ...d.data()}))
        .toList());
  }

  /// Send a text message (optionally with attachment metadata).
  Future<String> sendMessage(
    String chatId,
    String text, {
    String? attachmentUrl,
    String? attachmentType,
    String? attachmentName,
    int? attachmentSize,
    int? attachmentDuration,
  }) async {
    final uid = _myUid;
    if (uid == null) throw Exception('Not authenticated');

    final batch = _fs.db.batch();

    final msgRef = _fs.col('chats/$chatId/messages').doc();
    final msgData = <String, dynamic>{
      'senderId': uid,
      'text': text,
      'read': false,
      'createdAt': _fs.serverNow,
      if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
      if (attachmentType != null) 'attachmentType': attachmentType,
      if (attachmentName != null) 'attachmentName': attachmentName,
      if (attachmentSize != null) 'attachmentSize': attachmentSize,
      if (attachmentDuration != null) 'attachmentDuration': attachmentDuration,
    };
    batch.set(msgRef, msgData);

    final chatRef = _fs.doc('chats/$chatId');
    batch.update(chatRef, {
      'lastMessage': {
        'senderId': uid,
        'text': text,
        'createdAt': FieldValue.serverTimestamp(),
      },
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return msgRef.id;
  }

  /// Batch-mark all unread messages in a chat as read (where sender != me).
  Future<void> markRead(String chatId) async {
    final uid = _myUid;
    if (uid == null) return;

    final snap = await _fs
        .col('chats/$chatId/messages')
        .where('read', isEqualTo: false)
        .where('senderId', isNotEqualTo: uid)
        .get();

    if (snap.docs.isEmpty) return;

    final batch = _fs.db.batch();
    for (final doc in snap.docs) {
      batch.update(doc.reference, {'read': true});
    }
    // Reset unread counter for current user on the chat doc
    batch.update(_fs.doc('chats/$chatId'), {
      'unreadCount_$uid': 0,
    });
    await batch.commit();
  }

  /// Ensure a chat document exists between two users. Returns chatId.
  Future<String> ensureChat(String otherUid) async {
    final uid = _myUid;
    if (uid == null) throw Exception('Not authenticated');

    final participants = ([uid, otherUid]..sort());
    final chatId = participants.join('_');
    final ref = _fs.doc('chats/$chatId');
    final snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        'participantIds': participants,
        'lastMessage': {},
        'createdAt': _fs.serverNow,
        'updatedAt': _fs.serverNow,
      });
    }
    return chatId;
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────

final conversationsStreamProvider =
    StreamProvider.autoDispose<List<Conversation>>((ref) {
  return ref.read(firebaseChatRepositoryProvider).getConversations();
});

final messagesStreamProvider =
    StreamProvider.autoDispose.family<List<ChatMessage>, String>((ref, chatId) {
  return ref.read(firebaseChatRepositoryProvider).getMessages(chatId);
});
