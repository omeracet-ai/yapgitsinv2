import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
// Phase 344 — 3D efekt (Yapgitsin tab pattern'i tüm tab'lara yayıldı).
import '../../../../core/theme/card_3d.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/chat_repository.dart';
import '../../data/chat_service.dart';
import '../../data/presence_provider.dart';
import 'chat_detail_screen.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    // Phase 308 — Logout state: İşlerim ile aynı guest pattern.
    // Önceki davranış: chatService.connect() + conversationsProvider
    // anonim olarak çalıştırılıyordu, 401 hatası gösteriyordu.
    if (authState is AuthLoading || authState is AuthInitial) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (authState is! AuthAuthenticated) {
      return const _MessagesGuestView();
    }
    return const _AuthenticatedChatList();
  }
}

// Phase 308 — Logout sonrası Mesajlarım sekmesi için boş + CTA görünümü.
class _MessagesGuestView extends StatelessWidget {
  const _MessagesGuestView();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(l.chatTitle,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        // Phase 360 — yeşilden dark surface'a; diğer tab AppBar'larıyla
        // tutarlı (`AppColors.headerBackground(context)` theme-aware).
        // Phase 371b — light mode'da beyaz, dark mode'da koyu (tema-duyarlı).
        backgroundColor: AppColors.headerBackground(context),
        foregroundColor: AppColors.headerForeground,
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset('assets/icons/app_icon.png',
                    width: 80, height: 80, fit: BoxFit.cover),
              ),
              const SizedBox(height: 24),
              Text('Mesajlarınızı görüntülemek için giriş yapın.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 16, color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/giris-yap'),
                  child: Text(l.loginButton),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Phase 308 — Eski ChatListScreen state'i, sadece kimliği doğrulanmış
// kullanıcılar için. WebSocket connect ve presence yalnız burada başlatılır.
class _AuthenticatedChatList extends ConsumerStatefulWidget {
  const _AuthenticatedChatList();

  @override
  ConsumerState<_AuthenticatedChatList> createState() =>
      _AuthenticatedChatListState();
}

class _AuthenticatedChatListState
    extends ConsumerState<_AuthenticatedChatList> {
  @override
  void initState() {
    super.initState();
    // Phase 78: ensure socket is up so presence broadcasts hydrate the map.
    final chatService = ref.read(chatServiceProvider);
    try {
      chatService.connect();
    } catch (e, st) {
      debugPrint('chat_list_screen.initState.connect: $e\n$st');
    }
    // Touch the provider so it subscribes to presence events.
    ref.read(presenceProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final asyncConvos = ref.watch(conversationsProvider);
    // Seed presence from server-side conversation snapshot whenever it arrives.
    // Phase 466 (emülator boot fix) — build sırasında provider modify
    // Riverpod'da yasak; postFrameCallback ile pipeline tamamlandıktan
    // sonra çağrılır.
    asyncConvos.whenData((convos) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) return;
        ref.read(presenceProvider.notifier).seedFromConversations(convos);
      });
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(l.chatTitle,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        // Phase 360 — yeşilden dark surface'a; diğer tab AppBar'larıyla
        // tutarlı (`AppColors.headerBackground(context)` theme-aware).
        // Phase 371b — light mode'da beyaz, dark mode'da koyu (tema-duyarlı).
        backgroundColor: AppColors.headerBackground(context),
        foregroundColor: AppColors.headerForeground,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded,
                color: AppColors.headerForeground),
            tooltip: l.chatRefresh,
            onPressed: () => ref.invalidate(conversationsProvider),
          ),
          // Phase 367 — bildirimler kısayolu.
          IconButton(
            icon: Icon(Icons.notifications_none_rounded,
                color: AppColors.headerForeground),
            tooltip: 'Bildirimler',
            onPressed: () => context.push('/bildirimler'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(conversationsProvider);
          await ref.read(conversationsProvider.future);
        },
        child: asyncConvos.when(
          loading: () => ListSkeleton(itemCount: 8, itemBuilder: (_) => const NotificationSkeleton()),
          error: (e, _) => ListView(
            children: [
              const SizedBox(height: 80),
              EmptyState(
                icon: Icons.error_outline,
                title: l.chatLoadFailed,
                message: e.toString(),
              ),
            ],
          ),
          data: (convos) {
            if (convos.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 80),
                  EmptyState(
                    emoji: '💬',
                    title: l.chatNoConversations,
                    message: l.chatNoConversationsMessage,
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
                // Phase 78: live presence overrides static snapshot.
                final live = ref.watch(peerPresenceProvider(c.peerId));
                final online = live?.isOnline ?? c.peerOnline;
                final lastSeen = live?.lastSeenAt ?? c.peerLastSeenAt;
                return _buildChatItem(
                  context,
                  name: c.peerName ?? l.chatUnknownUser,
                  lastMessage: preview,
                  time: _formatTime(context, c.lastMessageAt),
                  unreadCount: c.unreadCount,
                  avatarColor: _avatarColor(index),
                  isOnline: online,
                  lastSeenLabel: online ? null : formatLastSeen(lastSeen),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatDetailScreen(
                          peerName: c.peerName ?? l.chatUnknownUser,
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

  String _formatTime(BuildContext context, DateTime dt) {
    // P190/4 — locale-aware via IntlFormatter (time for today, relative otherwise).
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final mDay = DateTime(dt.year, dt.month, dt.day);
    if (mDay == today) {
      return IntlFormatter.time(context, dt);
    }
    return IntlFormatter.relativeTime(context, dt);
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
    bool isOnline = false,
    String? lastSeenLabel,
  }) {
    final initials = trUpper(name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join());

    // Phase 344 — Mesajlarım item'larına 3D efekt: kart benzeri görünüm.
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: card3d(context, radius: 12, elevation: 1.0),
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Stack(
                  children: [
                    Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: avatarColor.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: avatarColor.withValues(alpha: 0.3),
                        width: 1.5),
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
                if (isOnline)
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C9A7),
                        shape: BoxShape.circle,
                        border:
                            Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
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
                  if (!isOnline && lastSeenLabel != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      lastSeenLabel,
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textHint),
                    ),
                  ],
                ],
              ),
            ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
