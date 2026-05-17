import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../../../auth/presentation/screens/profile_screen.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../categories/data/category_repository.dart';
import '../../../jobs/presentation/providers/job_provider.dart';
import '../../../jobs/presentation/screens/job_list_screen.dart';
import 'hizmet_al_screen.dart';
import '../../../notifications/data/unread_count_provider.dart';
import '../../../../core/widgets/category_card.dart';
import '../../../../core/widgets/job_status_badge.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../ai/presentation/widgets/ai_recommendations_section.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Ensure badge provider is materialized so its auth listener fires.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(unreadCountBadgeProvider.notifier);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final auth = ref.read(authStateProvider);
      if (auth is AuthAuthenticated) {
        ref.read(unreadCountBadgeProvider.notifier).refresh();
      }
    }
  }

  void _onItemTapped(int index) {
    final authState = ref.read(authStateProvider);
    final isLoggedIn = authState is AuthAuthenticated;
    // index 2 â€” "+" İlan Ver kısa yolu (tab değiştirmek yerine route push)
    if (index == 2) {
      if (isLoggedIn) {
        context.push('/ilan-ver');
      } else {
        context.push('/giris-yap', extra: {'returnTo': '/ilan-ver'});
      }
      return;
    }
    // Bildirimler (index 3) giriş gerektiriyor
    if (index == 3 && !isLoggedIn) {
      context.push('/giris-yap', extra: {'returnTo': '/'});
      return;
    }
    ref.read(selectedTabProvider.notifier).state = index;
    if (index == 3 && isLoggedIn) {
      // Refresh badge when entering notifications tab.
      ref.read(unreadCountBadgeProvider.notifier).refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    if (authState is AuthInitial || authState is AuthLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isLoggedIn = authState is AuthAuthenticated;
    final selectedIndex = ref.watch(selectedTabProvider);
    final unreadCount = ref.watch(unreadCountBadgeProvider);

    final List<Widget> pages = [
      _HomeTab(onSeeAllRequests: () => _onItemTapped(1)),
      const HizmetAlScreen(),
      const JobListScreen(),
      const NotificationScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: selectedIndex, children: pages),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
        decoration: BoxDecoration(
          color: AppColors.darkSurface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(AppRadius.xl),
            topRight: Radius.circular(AppRadius.xl),
          ),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(AppRadius.xl),
            topRight: Radius.circular(AppRadius.xl),
          ),
          child: BottomNavigationBar(
            currentIndex: selectedIndex,
            onTap: _onItemTapped,
            selectedItemColor: AppColors.darkPrimary,
            unselectedItemColor: AppColors.darkTextSecondary,
            showUnselectedLabels: true,
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.darkSurface,
            elevation: 0,
            selectedLabelStyle: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.bold),
            unselectedLabelStyle: const TextStyle(fontSize: 11),
            items: [
              const BottomNavigationBarItem(
                  icon: Icon(Icons.home_outlined),
                  activeIcon: Icon(Icons.home_rounded),
                  label: 'Yaptır'),
              const BottomNavigationBarItem(
                  icon: Icon(Icons.search_outlined),
                  activeIcon: Icon(Icons.search_rounded),
                  label: 'Yapgitsin'),
              BottomNavigationBarItem(
                  icon: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.darkPrimary,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.darkPrimary.withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add_rounded,
                        color: Colors.black, size: 24),
                  ),
                  activeIcon: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.darkPrimary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.add_rounded,
                        color: Colors.black, size: 24),
                  ),
                  label: 'İlan Ver'),
              BottomNavigationBarItem(
                  icon: _NotifIconWithBadge(
                    icon: isLoggedIn
                        ? Icons.notifications_outlined
                        : Icons.lock_outline_rounded,
                    count: isLoggedIn ? unreadCount : 0,
                  ),
                  activeIcon: _NotifIconWithBadge(
                    icon: Icons.notifications_rounded,
                    count: isLoggedIn ? unreadCount : 0,
                  ),
                  label: 'Bildirimlerim'),
              const BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline_rounded),
                  activeIcon: Icon(Icons.person_rounded),
                  label: 'Profil'),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ana Sayfa (Yaptır) sekmesi
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class _HomeTab extends ConsumerStatefulWidget {
  final VoidCallback onSeeAllRequests;
  const _HomeTab({required this.onSeeAllRequests});

  @override
  ConsumerState<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends ConsumerState<_HomeTab> {
  String? _selectedCategory;
  String? _selectedGroup;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    if (query.trim().isEmpty) return;
    ref.read(jobsProvider.notifier).filterJobs(query.trim());
    _searchController.clear();
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const JobListScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final userName = authState is AuthAuthenticated ? authState.displayName : null;
    final isLoggedIn = authState is AuthAuthenticated;
    final jobsAsync = ref.watch(jobsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        displacement: 80,
        onRefresh: () async {
          ref.invalidate(categoriesProvider);
          await ref.read(jobsProvider.notifier).fetchJobs();
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // â”€â”€ Hero SliverAppBar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: AppColors.background,
              elevation: 0,
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.pin,
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF0C1117), Color(0xFF161B22)],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    userName != null
                                        ? 'Merhaba, $userName'
                                        : 'Hoş Geldiniz',
                                    style: GoogleFonts.inter(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'En iyi usta, en iyi hizmet',
                                    style: GoogleFonts.playfairDisplay(
                                      color: AppColors.textPrimary,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                ],
                              ),
                              if (!isLoggedIn)
                                GestureDetector(
                                  onTap: () => context.push('/giris-yap'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 7),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                          color: Colors.white.withValues(alpha: 0.5)),
                                    ),
                                    child: const Text(
                                      'Giriş Yap',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Search bar
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.darkSurfaceElevated,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.darkBorder),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.2),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: TextField(
                              controller: _searchController,
                              onSubmitted: _onSearch,
                              textInputAction: TextInputAction.search,
                              style: const TextStyle(color: AppColors.darkText),
                              decoration: InputDecoration(
                                hintText: 'Hangi hizmete ihtiyacınız var?',
                                hintStyle: const TextStyle(
                                    color: AppColors.darkTextSecondary, fontSize: 14),
                                prefixIcon: const Icon(Icons.search,
                                    color: AppColors.darkPrimary),
                                suffixIcon: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.map_outlined,
                                          color: AppColors.primary),
                                      tooltip: 'Haritada Gör',
                                      onPressed: () =>
                                          context.push('/harita'),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.arrow_forward_rounded,
                                          color: AppColors.primary),
                                      onPressed: () =>
                                          _onSearch(_searchController.text),
                                    ),
                                  ],
                                ),
                                border: InputBorder.none,
                                contentPadding:
                                    const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              title: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Center(
                        child: Text(
                          'Y',
                          style: GoogleFonts.playfairDisplay(
                            color: Colors.black,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            height: 1.0,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'yapgitsin.',
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        height: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // â”€â”€ İlan Ver butonu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: ElevatedButton.icon(
                      onPressed: () {
                        if (isLoggedIn) {
                          context.push('/ilan-ver');
                        } else {
                          context.push('/giris-yap',
                              extra: {'returnTo': '/ilan-ver'});
                        }
                      },
                      icon: const Icon(Icons.add_circle_outline,
                          color: Colors.white),
                      label: const Text('Hizmet İlanı Ver',
                          style: TextStyle(
                              color: Colors.white, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.darkSurfaceElevated,
                        foregroundColor: AppColors.darkPrimary,
                        minimumSize: const Size(double.infinity, 56),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: const BorderSide(color: AppColors.darkBorder)),
                        elevation: 0,
                      ),
                    ),
                  ),

                  if (!isLoggedIn) _buildGuestBanner(context),

                  const SizedBox(height: 24),

                  // â”€â”€ Popüler Kategoriler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                  SectionHeader(
                    title: 'Popüler Kategoriler',
                    actionLabel: _selectedCategory != null ? 'Temizle' : null,
                    onAction: _selectedCategory != null
                        ? () => setState(() {
                              _selectedCategory = null;
                              _selectedGroup = null;
                            })
                        : null,
                  ),
                  const SizedBox(height: 10),

                  // Group filter chips
                  ref.watch(categoriesProvider).when(
                    data: (cats) {
                      final groups = <String>[];
                      for (final c in cats) {
                        final g = c['group'] as String? ?? '';
                        if (g.isNotEmpty && !groups.contains(g)) {
                          groups.add(g);
                        }
                      }
                      final visibleCats = _selectedGroup == null
                          ? cats
                          : cats
                              .where((c) => c['group'] == _selectedGroup)
                              .toList();

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            height: 34,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              children: [
                                _GroupChip(
                                  label: 'Tümü',
                                  isActive: _selectedGroup == null,
                                  onTap: () => setState(() {
                                    _selectedGroup = null;
                                    _selectedCategory = null;
                                  }),
                                ),
                                ...groups.map((g) => _GroupChip(
                                      label: g,
                                      isActive: _selectedGroup == g,
                                      onTap: () => setState(() {
                                        _selectedGroup =
                                            _selectedGroup == g ? null : g;
                                        _selectedCategory = null;
                                      }),
                                    )),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          // 2x2 fotoğraflı kategori grid (horizontal scroll)
                          SizedBox(
                            height: 130,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: visibleCats.length,
                              itemBuilder: (_, i) {
                                final cat = visibleCats[i];
                                final catName =
                                    cat['name'] as String? ?? '';
                                final emoji =
                                    cat['icon'] as String? ?? 'ğŸ”§';
                                final isActive =
                                    _selectedCategory == catName;
                                return SizedBox(
                                  width: 100,
                                  child: Padding(
                                    padding:
                                        const EdgeInsets.only(right: 10),
                                    child: CategoryCard(
                                      label: catName,
                                      emoji: emoji,
                                      isActive: isActive,
                                      onTap: () => setState(() =>
                                          _selectedCategory =
                                              isActive ? null : catName),
                                    ),
                                  ),
                                ).animate().fade(delay: (i * 50).ms);
                              },
                            ),
                          ),
                        ],
                      );
                    },
                    loading: () => const SizedBox(
                        height: 164,
                        child: Center(child: CircularProgressIndicator())),
                    error: (_, __) => const SizedBox.shrink(),
                  ),

                  const SizedBox(height: 24),

                  // â”€â”€ AI Önerileri (Phase 214) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                  if (isLoggedIn) const AiRecommendationsSection(),

                  // â”€â”€ Son İlanlar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                  SectionHeader(
                    title: 'Son İlanlar',
                    actionLabel: 'Tümünü Gör',
                    onAction: widget.onSeeAllRequests,
                  ),
                  const SizedBox(height: 12),

                  jobsAsync.when(
                    data: (jobs) {
                      final recent = jobs.take(5).toList();
                      if (recent.isEmpty) return const SizedBox.shrink();
                      return Column(
                        children: recent.asMap().entries.map((e) {
                          final job = e.value;
                          return _RecentJobRow(job: job)
                              .animate()
                              .fade(delay: (e.key * 60).ms);
                        }).toList(),
                      );
                    },
                    loading: () => const SizedBox(
                        height: 80,
                        child: Center(child: CircularProgressIndicator())),
                    error: (_, __) => const SizedBox.shrink(),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGuestBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          const Expanded(child: Text('İlan vermek için giriş yapın.', style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w500))),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => context.push('/giris-yap'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(8)),
              child: const Text('Giriş Yap', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Yardımcı widget'lar
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/// Recent job row for home screen â€” uses JobStatusBadge
class _RecentJobRow extends StatelessWidget {
  final Job job;
  const _RecentJobRow({required this.job});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.darkBorder, width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: job.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(job.icon, color: job.color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on_rounded,
                        size: 11, color: AppColors.textHint),
                    const SizedBox(width: 2),
                    Expanded(
                      child: Text(
                        job.location,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textHint),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                job.budget,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              JobStatusBadge.fromString(job.status ?? 'OPEN'),
            ],
          ),
        ],
      ),
    );
  }
}

/// Grup filtre chip'i (Tümü / Ev & Yaşam / Yapı & Tesisat ...)
class _GroupChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  const _GroupChip({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.darkPrimary : AppColors.darkSurfaceElevated,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          border: Border.all(
            color: isActive ? AppColors.darkPrimary : AppColors.darkBorder,
            width: 1.5,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                      color: AppColors.darkPrimary.withValues(alpha: 0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 2))
                ]
              : [],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isActive ? Colors.black : AppColors.darkTextSecondary,
          ),
        ),
      ),
    );
  }
}

/// Bell icon with red unread-count badge in the top-right corner.
class _NotifIconWithBadge extends StatelessWidget {
  final IconData icon;
  final int count;
  const _NotifIconWithBadge({required this.icon, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return Icon(icon);
    final label = count > 99 ? '99+' : '$count';
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: EdgeInsets.symmetric(
                horizontal: count > 9 ? 5 : 4, vertical: 1.5),
            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
            decoration: BoxDecoration(
              color: AppColors.error,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white, width: 1.5),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.bold,
                height: 1.1,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

