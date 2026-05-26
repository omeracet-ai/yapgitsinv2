import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../jobs/presentation/screens/job_opportunities_screen.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../../notifications/data/unread_count_provider.dart';

/// Yapgitsin sekmesi (sadeleşmiş — 2026-05-26):
///   • Üstte "Hizmet İlanı Ver" CTA
///   • Altta "Fırsatlar" listesi (JobOpportunitiesBody)
///
/// Eski "Hizmet İlanları" (usta offer listings) ve "Harita" sekmeleri
/// kullanıcı isteği ile gizlendi. Aynı widget hem Yapgitsin hem İşlerim
/// alt-sekmesinde kullanılır (içerik = paylaşımlı).
class HizmetAlScreen extends ConsumerWidget {
  const HizmetAlScreen({super.key, this.appBarTitle = 'Yapgitsin'});

  final String appBarTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(authStateProvider) is AuthAuthenticated;
    final unreadCount = ref.watch(unreadCountBadgeProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(appBarTitle,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          _NotifAppBarButton(
            count: isLoggedIn ? unreadCount : 0,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationScreen()),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PostJobCta(isLoggedIn: isLoggedIn),
          const _SectionHeader(text: 'Fırsatlar'),
          const Expanded(child: JobOpportunitiesBody()),
        ],
      ),
    );
  }
}

class _PostJobCta extends StatelessWidget {
  final bool isLoggedIn;
  const _PostJobCta({required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      color: AppColors.primary,
      child: SizedBox(
        height: 44,
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          icon: const Icon(Icons.add_rounded, size: 20),
          label: const Text('Hizmet İlanı Ver',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          onPressed: () {
            if (!isLoggedIn) {
              context.push('/giris-yap', extra: {'returnTo': '/ilan-ver'});
            } else {
              context.push('/ilan-ver');
            }
          },
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
      color: AppColors.background,
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(text,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _NotifAppBarButton extends StatelessWidget {
  final int count;
  final VoidCallback onTap;
  const _NotifAppBarButton({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Bildirimler',
      onPressed: onTap,
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.notifications_outlined),
          if (count > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary, width: 1),
                ),
                constraints:
                    const BoxConstraints(minWidth: 18, minHeight: 16),
                child: Text(
                  count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
