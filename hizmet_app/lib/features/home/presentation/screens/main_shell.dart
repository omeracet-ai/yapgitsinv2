import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../../../auth/presentation/screens/profile_screen.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../categories/data/category_repository.dart';
import '../../../jobs/presentation/providers/job_provider.dart';
import '../../../jobs/presentation/screens/job_list_screen.dart';
import 'hizmet_al_screen.dart';
import '../../../map/presentation/screens/map_screen.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  void _onItemTapped(int index) {
    final authState = ref.read(authStateProvider);
    final isLoggedIn = authState is AuthAuthenticated;
    // Bildirimler (index 3) giriş gerektiriyor
    if (index == 3 && !isLoggedIn) {
      context.push('/login', extra: {'returnTo': '/'});
      return;
    }
    ref.read(selectedTabProvider.notifier).state = index;
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    if (authState is AuthInitial || authState is AuthLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isLoggedIn = authState is AuthAuthenticated;
    final selectedIndex = ref.watch(selectedTabProvider);

    final List<Widget> pages = [
      _HomeTab(onSeeAllRequests: () => _onItemTapped(1)),
      const HizmetAlScreen(),
      const MapScreen(),
      const NotificationScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: selectedIndex, children: pages),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: selectedIndex,
          onTap: _onItemTapped,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textHint,
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          elevation: 0,
          selectedLabelStyle: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          items: [
            const BottomNavigationBarItem(
                icon: Icon(Icons.explore_outlined),
                activeIcon: Icon(Icons.explore_rounded),
                label: 'Keşfet'),
            const BottomNavigationBarItem(
                icon: Icon(Icons.handyman_outlined),
                activeIcon: Icon(Icons.handyman_rounded),
                label: 'Yapgitsin'),
            const BottomNavigationBarItem(
                icon: Icon(Icons.map_outlined),
                activeIcon: Icon(Icons.map_rounded),
                label: 'Harita'),
            BottomNavigationBarItem(
                icon: isLoggedIn
                    ? const Icon(Icons.notifications_outlined)
                    : const Icon(Icons.lock_outline_rounded),
                activeIcon: const Icon(Icons.notifications_rounded),
                label: 'Bildirimler'),
            const BottomNavigationBarItem(
                icon: Icon(Icons.person_outline_rounded),
                activeIcon: Icon(Icons.person_rounded),
                label: 'Profil'),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Sayfa (Keşfet) sekmesi
// ─────────────────────────────────────────────────────────────────────────────
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        toolbarHeight: 70,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              userName != null ? 'Merhaba, $userName 👋' : 'Hoş Geldiniz 👋',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text('HizmetApp', style: TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
        actions: [
          if (!isLoggedIn)
            TextButton.icon(
              onPressed: () => context.push('/login'),
              icon: const Icon(Icons.login, color: Colors.white, size: 18),
              label: const Text('Giriş Yap', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {},
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHero(context, ref, isLoggedIn),
              if (!isLoggedIn) _buildGuestBanner(context),
              const SizedBox(height: 20),

              // ── Kategoriler ───────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Kategoriler', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    if (_selectedCategory != null)
                      GestureDetector(
                        onTap: () => setState(() { _selectedCategory = null; _selectedGroup = null; }),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_selectedCategory!, style: const TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
                            const SizedBox(width: 4),
                            const Icon(Icons.close, size: 15, color: AppColors.primary),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              ref.watch(categoriesProvider).when(
                data: (cats) {
                  // Grupları çıkar (sıralı, benzersiz)
                  final groups = <String>[];
                  for (final c in cats) {
                    final g = c['group'] as String? ?? '';
                    if (g.isNotEmpty && !groups.contains(g)) groups.add(g);
                  }
                  // Seçili gruba göre filtrele
                  final visibleCats = _selectedGroup == null
                      ? cats
                      : cats.where((c) => c['group'] == _selectedGroup).toList();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Grup filtre şeridi
                      SizedBox(
                        height: 34,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          children: [
                            _GroupChip(
                              label: 'Tümü',
                              isActive: _selectedGroup == null,
                              onTap: () => setState(() { _selectedGroup = null; _selectedCategory = null; }),
                            ),
                            ...groups.map((g) => _GroupChip(
                              label: g,
                              isActive: _selectedGroup == g,
                              onTap: () => setState(() { _selectedGroup = _selectedGroup == g ? null : g; _selectedCategory = null; }),
                            )),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Kategori kartları
                      SizedBox(
                        height: 120,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: visibleCats.length,
                          itemBuilder: (_, i) {
                            final cat   = visibleCats[i];
                            final name  = cat['name']  as String? ?? '';
                            final emoji = cat['icon']  as String? ?? '🔧';
                            final isActive = _selectedCategory == name;
                            return _CategoryItem(
                              emoji: emoji, label: name, isActive: isActive,
                              onTap: () => setState(() => _selectedCategory = isActive ? null : name),
                            ).animate().fade().scale(delay: (i * 60).ms);
                          },
                        ),
                      ),
                    ],
                  );
                },
                loading: () => const SizedBox(height: 144, child: Center(child: CircularProgressIndicator())),
                error: (_, __) => const SizedBox.shrink(),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHero(BuildContext context, WidgetRef ref, bool isLoggedIn) {
    return Column(
      children: [
        Stack(
          children: [
            Container(
              height: 60,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.only(bottomLeft: Radius.circular(30), bottomRight: Radius.circular(30)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 5))],
                ),
                child: TextField(
                  controller: _searchController,
                  onSubmitted: _onSearch,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Hangi hizmete ihtiyacınız var?',
                    prefixIcon: const Icon(Icons.search, color: AppColors.primary),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.arrow_forward_rounded,
                          color: AppColors.primary),
                      onPressed: () => _onSearch(_searchController.text),
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ElevatedButton.icon(
            onPressed: () {
              if (isLoggedIn) { context.push('/post-job'); }
              else { context.push('/login', extra: {'returnTo': '/post-job'}); }
            },
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Hizmet İlanı Ver', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
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
            onTap: () => context.push('/login'),
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

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı widget'lar
// ─────────────────────────────────────────────────────────────────────────────

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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.border,
            width: 1.5,
          ),
          boxShadow: isActive
              ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.25), blurRadius: 6, offset: const Offset(0, 2))]
              : [],
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _CategoryItem extends StatelessWidget {
  final String emoji;
  final String label;
  final VoidCallback onTap;
  final bool isActive;

  const _CategoryItem(
      {required this.emoji,
      required this.label,
      required this.onTap,
      this.isActive = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 82,
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive
                ? AppColors.primary
                : AppColors.border,
            width: isActive ? 2 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 3)),
                ]
              : [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2)),
                ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isActive
                    ? Colors.white.withValues(alpha: 0.2)
                    : AppColors.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(emoji, style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(height: 6),
            Flexible(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight:
                          isActive ? FontWeight.bold : FontWeight.w500,
                      color: isActive ? Colors.white : AppColors.textPrimary,
                      height: 1.2),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}

