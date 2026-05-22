import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../jobs/presentation/screens/job_opportunities_screen.dart';
import '../../../jobs/presentation/screens/service_listings_screen.dart';
import '../../../map/presentation/screens/map_screen.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../../notifications/data/unread_count_provider.dart';

class HizmetAlScreen extends ConsumerStatefulWidget {
  const HizmetAlScreen({super.key});

  @override
  ConsumerState<HizmetAlScreen> createState() => _HizmetAlScreenState();
}

class _HizmetAlScreenState extends ConsumerState<HizmetAlScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // Phase Two-Sided — Ustalar tab kullanıcı isteğiyle gizlendi.
  // İşlerim ana navigasyona taşındı; bu ekranda artık 3 tab.
  static const _tabs = [
    Tab(text: 'Hizmet İlanları'),
    Tab(text: 'Fırsatlar'),
    Tab(text: 'Harita'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ref.watch(authStateProvider) is AuthAuthenticated;
    final unreadCount = ref.watch(unreadCountBadgeProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Yapgitsin',
            style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          _NotifAppBarButton(
            count: isLoggedIn ? unreadCount : 0,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const NotificationScreen(),
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.center,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontSize: 13),
          tabs: _tabs,
        ),
      ),
      body: SafeArea(
        top: false,
        child: TabBarView(
          controller: _tabController,
          children: const [
            ServiceListingsBody(),
            JobOpportunitiesBody(),
            MapScreen(),
          ],
        ),
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
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary, width: 1),
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
