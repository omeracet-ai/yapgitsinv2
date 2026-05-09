import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_constants.dart';

final chatRepositoryProvider = Provider((ref) => ChatRepository());

class Conversation {
  final String peerId;
  final String? peerName;
  final String? peerAvatarUrl;
  final String lastMessageText;
  final DateTime lastMessageAt;
  final bool lastFromMe;
  final int unreadCount;
  // Phase 78
  final bool peerOnline;
  final DateTime? peerLastSeenAt;

  Conversation({
    required this.peerId,
    required this.peerName,
    required this.peerAvatarUrl,
    required this.lastMessageText,
    required this.lastMessageAt,
    required this.lastFromMe,
    required this.unreadCount,
    this.peerOnline = false,
    this.peerLastSeenAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> j) {
    final last = Map<String, dynamic>.from(j['lastMessage'] as Map);
    final lsStr = j['peerLastSeenAt'] as String?;
    return Conversation(
      peerId: j['peerId'] as String,
      peerName: j['peerName'] as String?,
      peerAvatarUrl: j['peerAvatarUrl'] as String?,
      lastMessageText: (last['text'] as String?) ?? '',
      lastMessageAt:
          DateTime.tryParse(last['createdAt'] as String? ?? '') ??
              DateTime.now(),
      lastFromMe: (last['fromMe'] as bool?) ?? false,
      unreadCount: (j['unreadCount'] as num?)?.toInt() ?? 0,
      peerOnline: (j['peerOnline'] as bool?) ?? false,
      peerLastSeenAt: lsStr != null ? DateTime.tryParse(lsStr) : null,
    );
  }
}

class PresenceState {
  final String userId;
  final bool isOnline;
  final DateTime? lastSeenAt;

  const PresenceState({
    required this.userId,
    required this.isOnline,
    this.lastSeenAt,
  });

  factory PresenceState.fromJson(Map<String, dynamic> j) {
    final lsStr = j['lastSeenAt'] as String?;
    return PresenceState(
      userId: (j['userId'] as String?) ?? '',
      isOnline: (j['isOnline'] as bool?) ?? false,
      lastSeenAt: lsStr != null ? DateTime.tryParse(lsStr) : null,
    );
  }
}

class ChatRepository {
  final Dio _dio;

  ChatRepository()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  /// Phase 78: query single-user presence.
  Future<PresenceState?> getPresence(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return null;
    final res = await _dio.get(
      '/chat/presence/$userId',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return PresenceState.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// Phase 139: upload a chat attachment (image or document).
  /// Returns {url, type, name, size}.
  Future<Map<String, dynamic>?> uploadAttachment(String filePath) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return null;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final res = await _dio.post(
      '/uploads/chat-attachment',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Phase 151: upload a chat voice note. Returns {url, type:'audio', name, size, duration?}.
  Future<Map<String, dynamic>?> uploadAudio(
    String filePath, {
    int? durationSec,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return null;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      if (durationSec != null) 'duration': durationSec.toString(),
    });
    final res = await _dio.post(
      '/uploads/chat-audio',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Phase 153: translate a chat message to targetLang ('tr'|'en'|'az').
  /// Returns null if not signed in. Throws on backend error (e.g. 503 if
  /// ANTHROPIC_API_KEY is missing on backend).
  Future<String?> translateMessage(String messageId, String targetLang) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return null;
    final res = await _dio.post(
      '/chat/messages/$messageId/translate',
      data: {'targetLang': targetLang},
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final data = Map<String, dynamic>.from(res.data as Map);
    return data['translated'] as String?;
  }

  Future<List<Conversation>> getConversations() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return [];
    final res = await _dio.get(
      '/chat/conversations',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final list = res.data as List;
    return list
        .map((e) => Conversation.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}

final conversationsProvider =
    FutureProvider.autoDispose<List<Conversation>>((ref) async {
  return ref.read(chatRepositoryProvider).getConversations();
});
