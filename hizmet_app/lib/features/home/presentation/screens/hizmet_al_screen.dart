import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../jobs/presentation/screens/job_opportunities_screen.dart';
import '../../../jobs/presentation/screens/my_jobs_screen.dart';
import '../../../map/presentation/screens/map_screen.dart';
import '../../../service_requests/presentation/screens/service_request_screen.dart';

class HizmetAlScreen extends ConsumerStatefulWidget {
  const HizmetAlScreen({super.key});

  @override
  ConsumerState<HizmetAlScreen> createState() => _HizmetAlScreenState();
}

class _HizmetAlScreenState extends ConsumerState<HizmetAlScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _tabs = [
    Tab(text: 'Hizmet İlanları'),
    Tab(text: 'Fırsatlar'),
    Tab(text: 'Harita'),
    Tab(text: 'İşlerim'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) return;
    if (_tabController.index == 3) {
      final isLoggedIn = ref.read(authStateProvider) is AuthAuthenticated;
      if (!isLoggedIn) {
        _tabController.animateTo(_tabController.previousIndex);
        context.push('/giris-yap');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Yapgitsin', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          unselectedLabelStyle: const TextStyle(fontSize: 13),
          tabs: _tabs,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          ServiceRequestBody(),
          JobOpportunitiesBody(),
          MapScreen(),
          MyJobsBody(),
        ],
      ),
    );
  }
}
