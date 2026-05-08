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

  Conversation({
    required this.peerId,
    required this.peerName,
    required this.peerAvatarUrl,
    required this.lastMessageText,
    required this.lastMessageAt,
    required this.lastFromMe,
    required this.unreadCount,
  });

  factory Conversation.fromJson(Map<String, dynamic> j) {
    final last = Map<String, dynamic>.from(j['lastMessage'] as Map);
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
