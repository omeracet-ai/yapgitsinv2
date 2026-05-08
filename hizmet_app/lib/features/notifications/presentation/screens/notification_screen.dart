import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/data/auth_repository.dart';
import '../../data/unread_count_provider.dart';

// ─── Provider ─────────────────────────────────────────────────────────────────

final notificationsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final authRepo = ref.watch(authRepositoryProvider);
  final token = await authRepo.getToken();
  if (token == null) return [];
  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 8),
  ));
  try {
    final res = await dio.get(
      '/notifications',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return List<Map<String, dynamic>>.from(res.data as List);
  } catch (_) {
    return [];
  }
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final authRepo = ref.watch(authRepositoryProvider);
  final token = await authRepo.getToken();
  if (token == null) return 0;
  final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
  try {
    final res = await dio.get('/notifications/unread-count',
        options: Options(headers: {'Authorization': 'Bearer $token'}));
    return (res.data['count'] as num?)?.toInt() ?? 0;
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

    if (authState is! AuthAuthenticated) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Bildirimler'),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
        ),
        body: const Center(
          child: Text('Bildirimleri görmek için giriş yapın.',
              style: TextStyle(color: AppColors.textHint)),
        ),
      );
    }

    final notifAsync = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Bildirimler'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          notifAsync.maybeWhen(
            data: (notifs) {
              final unread = notifs.where((n) => n['isRead'] == false).length;
              if (unread == 0) return const SizedBox.shrink();
              return TextButton.icon(
                onPressed: () async {
                  final authRepo = ref.read(authRepositoryProvider);
                  final token = await authRepo.getToken();
                  if (token == null) return;
                  await Dio(BaseOptions(baseUrl: ApiConstants.baseUrl)).patch(
                    '/notifications/read-all',
                    options: Options(headers: {'Authorization': 'Bearer $token'}),
                  );
                  ref.invalidate(notificationsProvider);
                  ref.read(unreadCountBadgeProvider.notifier).reset();
                },
                icon: const Icon(Icons.done_all, color: Colors.white, size: 18),
                label: const Text('Tümünü Oku',
                    style: TextStyle(color: Colors.white, fontSize: 12)),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
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
            return const EmptyState(
              icon: Icons.notifications_off_outlined,
              title: 'Bildirim yok',
              message: 'Yeni gelişmeler burada görünecek.',
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
                  final authRepo = ref.read(authRepositoryProvider);
                  final token = await authRepo.getToken();
                  if (token == null) return;
                  final id = notifications[i]['id'] as String?;
                  if (id == null) return;
                  final wasUnread = notifications[i]['isRead'] == false;
                  await Dio(BaseOptions(baseUrl: ApiConstants.baseUrl)).patch(
                    '/notifications/$id/read',
                    options: Options(headers: {'Authorization': 'Bearer $token'}),
                  );
                  ref.invalidate(notificationsProvider);
                  if (wasUnread) {
                    ref.read(unreadCountBadgeProvider.notifier).decrement();
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Kart ─────────────────────────────────────────────────────────────────────

class _NotifCard extends StatelessWidget {
  final Map<String, dynamic> notif;
  final VoidCallback onRead;
  const _NotifCard({required this.notif, required this.onRead});

  @override
  Widget build(BuildContext context) {
    final type    = notif['type']    as String? ?? '';
    final title   = notif['title']   as String? ?? '';
    final body    = notif['body']    as String? ?? '';
    final isRead  = notif['isRead']  as bool?   ?? false;
    final refId   = notif['refId']   as String?;
    final createdAt = notif['createdAt'] as String? ?? '';
    final timeStr = _formatTime(createdAt);

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
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : AppColors.primaryLight.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isRead ? Colors.grey.shade100 : AppColors.primary.withValues(alpha: 0.3),
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

  String _formatTime(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1)  return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk önce';
      if (diff.inHours   < 24) return '${diff.inHours} saat önce';
      return '${diff.inDays} gün önce';
    } catch (_) {
      return '';
    }
  }
}
