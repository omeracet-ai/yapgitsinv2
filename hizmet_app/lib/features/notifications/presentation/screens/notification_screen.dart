import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../calendar/presentation/calendar_screen.dart';
import '../../../jobs/presentation/screens/job_detail_screen.dart';
import '../../data/notification_repository.dart';
import '../../data/unread_count_provider.dart';

// ─── Provider ─────────────────────────────────────────────────────────────────

final notificationsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return [];
  try {
    return await ref.read(notificationRepositoryProvider).list();
  } catch (_) {
    return [];
  }
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return 0;
  try {
    return await ref.read(notificationRepositoryProvider).unreadCount();
  } catch (_) {
    return 0;
  }
});

// ─── Screen ───────────────────────────────────────────────────────────────────

class NotificationScreen extends ConsumerWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final l = AppLocalizations.of(context);

    if (authState is! AuthAuthenticated) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text(l.notificationsTitle),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Text(l.notificationsLoginPrompt,
              style: const TextStyle(color: AppColors.textHint)),
        ),
      );
    }

    final notifAsync = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(l.notificationsTitle),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        actions: [
          notifAsync.maybeWhen(
            data: (notifs) {
              final unread = notifs.where((n) => n['isRead'] == false).length;
              if (unread == 0) return const SizedBox.shrink();
              return TextButton.icon(
                onPressed: () async {
                  try {
                    await ref
                        .read(notificationRepositoryProvider)
                        .markAllRead();
                  } catch (_) {
                    return;
                  }
                  ref.invalidate(notificationsProvider);
                  ref.read(unreadCountBadgeProvider.notifier).reset();
                },
                style: TextButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  foregroundColor: AppColors.primary,
                ),
                icon: const Icon(Icons.done_all, size: 18),
                label: Text(l.notificationsMarkAllRead,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          IconButton(
            tooltip: 'Yenile',
            icon: const Icon(Icons.refresh),
            color: AppColors.textPrimary,
            onPressed: () => ref.invalidate(notificationsProvider),
          ),
        ],
      ),
      body: notifAsync.when(
        loading: () => ListSkeleton(
          padding: const EdgeInsets.all(12),
          itemCount: 6,
          itemBuilder: (_) => const NotificationSkeleton(),
        ),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (notifications) {
          if (notifications.isEmpty) {
            return EmptyState(
              icon: Icons.notifications_off_outlined,
              title: l.notificationsEmpty,
              message: l.notificationsEmptyMessage,
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _NotifCard(
                notif: notifications[i],
                onRead: () async {
                  final id = notifications[i]['id'] as String?;
                  if (id == null) return;
                  final wasUnread = notifications[i]['isRead'] == false;
                  try {
                    await ref
                        .read(notificationRepositoryProvider)
                        .markRead(id);
                  } catch (_) {
                    return;
                  }
                  ref.invalidate(notificationsProvider);
                  if (wasUnread) {
                    ref.read(unreadCountBadgeProvider.notifier).decrement();
                  }
                },
                onNavigate: () => _handleDeepLink(context, notifications[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Phase 71 — Deep link routing ─────────────────────────────────────────────

void _handleDeepLink(BuildContext context, Map<String, dynamic> notif) {
  final relatedType = notif['relatedType'] as String?;
  final relatedId =
      (notif['relatedId'] as String?) ?? (notif['refId'] as String?);
  if (relatedType == null || relatedId == null || relatedId.isEmpty) return;
  switch (relatedType) {
    case 'job':
      // JobDetailScreen requires display fields; pass minimal placeholders —
      // it loads full data via id from the API on init.
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => JobDetailScreen(
            id: relatedId,
            title: notif['title'] as String? ?? 'İlan',
            description: '',
            location: '',
            budget: '',
            category: '',
            postedAt: '',
            icon: Icons.work_outline,
            color: AppColors.primary,
          ),
        ),
      );
      break;
    case 'booking':
      // No dedicated booking-detail route yet; open Calendar (lists bookings)
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CalendarScreen()),
      );
      break;
    case 'user':
      context.go('/profil/$relatedId');
      break;
    default:
      // 'system' veya bilinmeyen — no-op
      break;
  }
}

// ─── Kart ─────────────────────────────────────────────────────────────────────

class _NotifCard extends StatelessWidget {
  final Map<String, dynamic> notif;
  final VoidCallback onRead;
  final VoidCallback onNavigate;
  const _NotifCard({
    required this.notif,
    required this.onRead,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final type    = notif['type']    as String? ?? '';
    final title   = notif['title']   as String? ?? '';
    final body    = notif['body']    as String? ?? '';
    final isRead  = notif['isRead']  as bool?   ?? false;
    final refId   = notif['refId']   as String?;
    final createdAt = notif['createdAt'] as String? ?? '';
    final timeStr = _formatTime(context, createdAt);

    final (icon, iconColor, bgColor) = switch (type) {
      'new_offer'         => (Icons.local_offer_rounded,   AppColors.primary,  AppColors.primaryLight),
      'offer_accepted'    => (Icons.check_circle_rounded,  Colors.green,       Colors.green.shade50),
      'offer_rejected'    => (Icons.cancel_rounded,        Colors.red,         Colors.red.shade50),
      'booking_request'   => (Icons.calendar_today,        Colors.orange,      Colors.orange.shade50),
      'booking_confirmed' => (Icons.event_available,       Colors.teal,        Colors.teal.shade50),
      'booking_completed' => (Icons.stars_rounded,         Colors.amber,       Colors.amber.shade50),
      'booking_cancelled' => (Icons.event_busy,            Colors.red,         Colors.red.shade50),
      'new_review'        => (Icons.star_rounded,          Colors.amber,       Colors.amber.shade50),
      'system'            => (Icons.campaign,               AppColors.primary,  AppColors.primaryLight),
      _                   => (Icons.notifications_rounded, AppColors.primary,  AppColors.primaryLight),
    };

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () {
        if (!isRead) onRead();
        // Phase 71 — deep link routing on tap
        onNavigate();
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isRead ? AppColors.surface : AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isRead ? AppColors.border : AppColors.primary.withValues(alpha: 0.4),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: Text(title,
                          style: TextStyle(
                              fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.textPrimary)),
                    ),
                    if (!isRead)
                      Container(
                        width: 8, height: 8,
                        decoration: const BoxDecoration(
                            color: AppColors.primary, shape: BoxShape.circle),
                      ),
                  ]),
                  const SizedBox(height: 4),
                  Text(body,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Row(children: [
                    Text(timeStr,
                        style: const TextStyle(fontSize: 11, color: AppColors.textHint)),
                    if (refId != null) ...[
                      const Spacer(),
                      const Text('Detaya Git',
                          style: TextStyle(fontSize: 11, color: AppColors.primary,
                              fontWeight: FontWeight.w600)),
                      const Icon(Icons.chevron_right, size: 14, color: AppColors.primary),
                    ],
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(BuildContext context, String iso) {
    // P190/4 — IntlFormatter.relativeTime (locale-aware).
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return IntlFormatter.relativeTime(context, dt);
    } catch (_) {
      return '';
    }
  }
}
