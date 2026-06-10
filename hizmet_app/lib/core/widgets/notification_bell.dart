import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../../features/notifications/data/unread_count_provider.dart';
import '../../features/notifications/presentation/screens/notification_screen.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

/// Reusable AppBar notification bell with an unread-count badge.
///
/// Icon color inherits the AppBar's foregroundColor (not hardcoded) so it
/// adapts per screen. Shows a count of 0 when the user is not logged in.
class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(authStateProvider) is AuthAuthenticated;
    final count = isLoggedIn ? ref.watch(unreadCountBadgeProvider) : 0;
    // Phase 499 — explicit foreground inheritance. Bazı AppBar bağlamlarında
    // IconTheme propagasyonu yetersiz kalıyor ve ikon görünmüyordu.
    final iconColor = IconTheme.of(context).color ??
        AppBarTheme.of(context).foregroundColor ??
        Theme.of(context).appBarTheme.foregroundColor ??
        AppColors.headerForeground;

    return IconButton(
      tooltip: 'Bildirimler',
      color: iconColor,
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const NotificationScreen(),
        ),
      ),
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(Icons.notifications_outlined, color: iconColor),
          if (count > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white, width: 1),
                ),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 16),
                child: Text(
                  count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
