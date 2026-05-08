import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../data/chat_repository.dart';
import 'chat_detail_screen.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncConvos = ref.watch(conversationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mesajlar',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: 'Yenile',
            onPressed: () => ref.invalidate(conversationsProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(conversationsProvider);
          await ref.read(conversationsProvider.future);
        },
        child: asyncConvos.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 80),
              EmptyState(
                icon: Icons.error_outline,
                title: 'Konuşmalar yüklenemedi',
                message: e.toString(),
              ),
            ],
          ),
          data: (convos) {
            if (convos.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyState(
                    emoji: '💬',
                    title: 'Henüz mesaj yok',
                    message:
                        'Bir ilana teklif verdiğinde veya teklif aldığında konuşmalar burada görünecek.',
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: convos.length,
              separatorBuilder: (_, __) => const Divider(
                  height: 1, indent: 88, endIndent: 16, thickness: 0.5),
              itemBuilder: (context, index) {
                final c = convos[index];
                final preview = c.lastFromMe
                    ? 'Sen: ${c.lastMessageText}'
                    : c.lastMessageText;
                return _buildChatItem(
                  context,
                  name: c.peerName ?? 'Kullanıcı',
                  lastMessage: preview,
                  time: _formatTime(c.lastMessageAt),
                  unreadCount: c.unreadCount,
                  avatarColor: _avatarColor(index),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatDetailScreen(
                          peerName: c.peerName ?? 'Kullanıcı',
                          peerId: c.peerId,
                        ),
                      ),
                    ).then((_) => ref.invalidate(conversationsProvider));
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final mDay = DateTime(dt.year, dt.month, dt.day);
    if (mDay == today) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    final diff = today.difference(mDay).inDays;
    if (diff == 1) return 'Dün';
    if (diff < 7) return '$diff gün';
    return '${dt.day}.${dt.month}';
  }

  Color _avatarColor(int index) {
    const colors = [
      Color(0xFF007DFE),
      Color(0xFF00C9A7),
      Color(0xFFFFA000),
      Color(0xFFDE4437),
      Color(0xFF6C5CE7),
    ];
    return colors[index % colors.length];
  }

  Widget _buildChatItem(
    BuildContext context, {
    required String name,
    required String lastMessage,
    required String time,
    required int unreadCount,
    required Color avatarColor,
    required VoidCallback onTap,
  }) {
    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: avatarColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(
                    color: avatarColor.withValues(alpha: 0.3), width: 1.5),
              ),
              child: Center(
                child: Text(
                  initials.isEmpty ? '?' : initials,
                  style: TextStyle(
                      color: avatarColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 18),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontWeight: unreadCount > 0
                                    ? FontWeight.bold
                                    : FontWeight.w600,
                                fontSize: 15,
                                color: AppColors.textPrimary)),
                      ),
                      Text(time,
                          style: TextStyle(
                              fontSize: 12,
                              color: unreadCount > 0
                                  ? AppColors.primary
                                  : AppColors.textHint,
                              fontWeight: unreadCount > 0
                                  ? FontWeight.w600
                                  : FontWeight.normal)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lastMessage,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: unreadCount > 0
                                  ? AppColors.textPrimary
                                  : AppColors.textSecondary,
                              fontSize: 13,
                              fontWeight: unreadCount > 0
                                  ? FontWeight.w500
                                  : FontWeight.normal),
                        ),
                      ),
                      if (unreadCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          constraints: const BoxConstraints(minWidth: 22),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                              color: AppColors.error,
                              borderRadius: BorderRadius.circular(12)),
                          child: Text(
                            unreadCount > 99 ? '99+' : '$unreadCount',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
