import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'chat_detail_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mesajlar'),
        backgroundColor: AppColors.primary,
        actions: [
          IconButton(icon: const Icon(Icons.search, color: Colors.white), onPressed: () {}),
        ],
      ),
      body: ListView.separated(
        itemCount: 8,
        separatorBuilder: (context, index) => const Divider(height: 1, indent: 80),
        itemBuilder: (context, index) {
          final name = index % 2 == 0 ? 'Ahmet Usta' : 'Mehmet Tesisat';
          return _buildChatItem(
            context,
            name: name,
            lastMessage: 'Teklifim hakkında ne düşünüyorsunuz?',
            time: '14:20',
            unreadCount: index == 0 ? 2 : 0,
            isOnline: index % 3 == 0,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ChatDetailScreen(peerName: name, peerId: 'peer-$index'),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildChatItem(
    BuildContext context, {
    required String name,
    required String lastMessage,
    required String time,
    required int unreadCount,
    required bool isOnline,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Stack(
        children: [
          const CircleAvatar(radius: 28, backgroundColor: AppColors.primaryLight, child: Icon(Icons.person, color: AppColors.primary, size: 28)),
          if (isOnline)
            Positioned(right: 2, bottom: 2, child: Container(height: 12, width: 12, decoration: BoxDecoration(color: Colors.green, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)))),
        ],
      ),
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(time, style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
        ],
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                lastMessage,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: unreadCount > 0 ? AppColors.textPrimary : AppColors.textSecondary, fontWeight: unreadCount > 0 ? FontWeight.w600 : FontWeight.normal),
              ),
            ),
            if (unreadCount > 0)
              Container(padding: const EdgeInsets.all(6), decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle), child: Text('$unreadCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
          ],
        ),
      ),
      onTap: onTap,
    );
  }
}
