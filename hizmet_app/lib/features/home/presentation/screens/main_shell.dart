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
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: _onItemTapped,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textHint,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
        items: [
          const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Keşfet'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.construction_outlined), activeIcon: Icon(Icons.construction), label: 'Yapgitsin'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'Harita'),
          BottomNavigationBarItem(
              icon: isLoggedIn ? const Icon(Icons.notifications_outlined) : const Icon(Icons.lock_outline),
              activeIcon: const Icon(Icons.notifications),
              label: 'Bildirimler'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profil'),
        ],
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
                        height: 110,
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

              const SizedBox(height: 24),

              // TODO: Öne Çıkan İlanlar — gerektiğinde aşağıdaki bloğu geri aç
              // Padding(
              //   padding: const EdgeInsets.symmetric(horizontal: 16),
              //   child: Row(
              //     mainAxisAlignment: MainAxisAlignment.spaceBetween,
              //     children: [
              //       const Text('Öne Çıkan İlanlar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              //       TextButton(
              //         onPressed: widget.onSeeAllRequests,
              //         child: const Text('Tümünü Gör', style: TextStyle(color: AppColors.primary)),
              //       ),
              //     ],
              //   ),
              // ),
              // ref.watch(serviceRequestsProvider).when(
              //   data: (requests) {
              //     final featured = requests.where((r) => r['featuredOrder'] != null).toList()
              //       ..sort((a, b) => (a['featuredOrder'] as int).compareTo(b['featuredOrder'] as int));
              //     if (featured.isEmpty) {
              //       return Padding(
              //         padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              //         child: GestureDetector(
              //           onTap: widget.onSeeAllRequests,
              //           child: Container(
              //             padding: const EdgeInsets.all(14),
              //             decoration: BoxDecoration(
              //               color: Colors.grey.shade50,
              //               borderRadius: BorderRadius.circular(12),
              //               border: Border.all(color: Colors.grey.shade200),
              //             ),
              //             child: Row(children: [
              //               Icon(Icons.handshake_outlined, color: Colors.grey.shade400, size: 20),
              //               const SizedBox(width: 8),
              //               Text('Tüm hizmet ilanlarını gör', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
              //               const Spacer(),
              //               Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 18),
              //             ]),
              //           ),
              //         ),
              //       );
              //     }
              //     return SizedBox(
              //       height: 148,
              //       child: ListView.builder(
              //         scrollDirection: Axis.horizontal,
              //         padding: const EdgeInsets.symmetric(horizontal: 16),
              //         itemCount: featured.length,
              //         itemBuilder: (_, i) {
              //           final item = featured[i];
              //           final title    = item['title']?.toString() ?? '';
              //           final location = item['location']?.toString() ?? '';
              //           final initials = title.isNotEmpty
              //               ? title.split(' ').take(2).map((w) => w.isNotEmpty ? w[0] : '').join().toUpperCase()
              //               : '?';
              //           return GestureDetector(
              //             onTap: widget.onSeeAllRequests,
              //             child: Container(
              //               width: 110,
              //               margin: const EdgeInsets.only(right: 12),
              //               padding: const EdgeInsets.all(10),
              //               decoration: BoxDecoration(
              //                 color: Colors.white,
              //                 borderRadius: BorderRadius.circular(14),
              //                 border: Border.all(color: Colors.amber.shade200, width: 1.5),
              //                 boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2))],
              //               ),
              //               child: Column(
              //                 mainAxisAlignment: MainAxisAlignment.center,
              //                 children: [
              //                   CircleAvatar(
              //                     radius: 24,
              //                     backgroundColor: AppColors.primaryLight,
              //                     child: Text(initials, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary)),
              //                   ),
              //                   const SizedBox(height: 6),
              //                   Text(title, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
              //                       style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              //                   const SizedBox(height: 3),
              //                   Text(location, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
              //                       style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
              //                   Container(
              //                     margin: const EdgeInsets.only(top: 4),
              //                     padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              //                     decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(6)),
              //                     child: Text('⭐ Öne Çıkan', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.amber.shade700)),
              //                   ),
              //                 ],
              //               ),
              //             ),
              //           ).animate().fade().scale(delay: (i * 80).ms);
              //         },
              //       ),
              //     );
              //   },
              //   loading: () => const SizedBox(height: 130, child: Center(child: CircularProgressIndicator())),
              //   error: (_, __) => const SizedBox.shrink(),
              // ),

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
                  onChanged: (_) {},
                  onSubmitted: (_) {},
                  decoration: const InputDecoration(
                    hintText: 'Hangi hizmete ihtiyacınız var?',
                    prefixIcon: Icon(Icons.search, color: AppColors.primary),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 16),
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

  const _CategoryItem({required this.emoji, required this.label, required this.onTap, this.isActive = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary : AppColors.primaryLight,
                borderRadius: BorderRadius.circular(18),
                border: isActive ? Border.all(color: AppColors.primary, width: 2) : null,
              ),
              child: Text(emoji, style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(height: 5),
            Flexible(
              child: Text(label,
                  style: TextStyle(fontSize: 11, fontWeight: isActive ? FontWeight.bold : FontWeight.w500, color: isActive ? AppColors.primary : null),
                  textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}

