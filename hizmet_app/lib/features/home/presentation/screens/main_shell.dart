// Phase 268c — Tab düzeni revert: Yaptır / Yapgitsin / Harita / İşlerim / Profil
// (Yaptır geri alındı, Harita 3. sırada — kullanıcı talebi 2026-05-27).
// _HomeTab içindeki bazı yardımcı section'lar şu an reference edilmiyor (dead
// code) — gelecekteki restoration için saklanıyor; analyzer warning'i suppress.
// ignore_for_file: unused_element, unused_field, unused_local_variable, prefer_const_declarations
import 'dart:async'; // Phase 334 — `unawaited` için.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
// Phase 344 — 3D card pattern tüm tab'lara yayıldı.
import '../../../../core/theme/card_3d.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../../../auth/presentation/screens/profile_screen.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../categories/data/category_repository.dart';
import '../../../jobs/presentation/providers/job_provider.dart' as jp;
import '../../../jobs/presentation/providers/job_provider.dart' show jobsProvider, Job;
import '../../../jobs/presentation/screens/job_detail_screen.dart';
import '../../../jobs/presentation/widgets/job_preview_sheet.dart';
import '../../../jobs/presentation/screens/my_jobs_screen.dart';
import '../../../../core/app_config/app_config_provider.dart';
import '../../../../core/widgets/yapgitsin_loader.dart';
import '../../../providers/data/provider_repository.dart';
import '../../../providers/presentation/screens/provider_list_screen.dart';
import '../../../providers/presentation/screens/provider_profile_screen.dart';
import 'hizmet_al_screen.dart';
// Phase 297 — MapScreen artık ana tab değil; Yapgitsin header'ından açılır.
// Phase 305 — Mesajlarım sekmesi (eski job_detail Sorular tab'ının yerine).
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../notifications/data/unread_count_provider.dart';
// Phase 334 — app-launch'ta bekleyen değerlendirme popup'ı.
import '../../../reviews/presentation/widgets/pending_reviews_popup.dart';
import '../../../../core/widgets/category_card.dart';
import '../../../../core/widgets/notification_bell.dart';
import '../../../../core/widgets/job_status_badge.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../../core/widgets/oem_battery_sheet.dart';

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
      // Phase 334 — Authenticated kullanıcıda bekleyen değerlendirmeleri
      // sor; varsa popup aç. 24h cooldown widget içinde.
      final auth = ref.read(authStateProvider);
      if (auth is AuthAuthenticated && mounted) {
        // Build sonrası, frame'i bloklamadan asenkron koş.
        unawaited(maybeShowPendingReviewsPopup(context, ref));
        // Phase 439b — Xiaomi/Huawei/Oppo/Vivo gibi cihazlarda pil whitelist
        // onboarding sheet (ilk push grant sonrası, kullanıcı başına bir kez).
        unawaited(Future.delayed(const Duration(seconds: 2), () {
          if (mounted) OemBatterySheet.showIfNeeded(context);
        }));
      }
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
    // Phase 310 — MainShell tab koruması kaldırıldı. Yeni düzen (Phase 305):
    // 0 Yaptır · 1 Yapgitsin · 2 İşlerim · 3 Mesajlarım · 4 Profil.
    // Her korumalı sekme (İşlerim/Mesajlarım/Profil) kendi guest view'ını
    // (Phase 306/308 + ProfileScreen.buildGuestView) gösterir; CTA
    // üzerinden /giris-yap'a yönlendirir.
    ref.read(selectedTabProvider.notifier).state = index;
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    if (authState is AuthInitial || authState is AuthLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: const YapgitsinLoader(size: 72),
      );
    }

    final selectedIndex = ref.watch(selectedTabProvider);

    // Phase 268c — Tab düzeni: Yaptır · Yapgitsin · Harita · İşlerim · Profil
    // Phase 268d — AppBar başlığı remote app-config branding.appTitle'dan gelir
    // (yoksa 'Yapgitsin'). Sync provider cache/fallback'i blocking olmadan döner.
    final appConfig = ref.watch(appConfigSyncProvider);
    final brandingTitle = appConfig.branding['appTitle'];
    final appBarTitle = (brandingTitle is String && brandingTitle.isNotEmpty)
        ? brandingTitle
        : 'Yapgitsin';
    // Phase 305 — 5 sekmeli düzen: Yaptır / Yapgitsin / İşlerim / Mesajlarım / Profil.
    // (Mesajlarım = chat list; eski job_detail Sorular tab'ı buraya taşındı.
    // Erişim: backend tarafında sadece accepted-offer çiftleri için açık.)
    final List<Widget> pages = [
      _HomeTab(onSeeAllRequests: () {
        ref.read(selectedTabProvider.notifier).state = 1;
      }),
      HizmetAlScreen(appBarTitle: appBarTitle),
      const MyJobsScreen(showAppBar: true),
      const ChatListScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: selectedIndex, children: pages),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
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
            key: const Key('main-bottom-nav'),
            currentIndex: selectedIndex,
            onTap: _onItemTapped,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.textSecondary,
            showUnselectedLabels: true,
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.surface,
            elevation: 0,
            selectedLabelStyle: const TextStyle(
                fontSize: 11, fontWeight: FontWeight.bold),
            unselectedLabelStyle: const TextStyle(fontSize: 11),
            // Phase 500 — Mesajlarım sekmesinin üzerinde unread bildirim
            // badge'i. unreadCountBadgeProvider auth + 45s polling ile güncel.
            items: [
              const BottomNavigationBarItem(
                  icon: Icon(Icons.home_outlined),
                  activeIcon: Icon(Icons.home_rounded),
                  label: 'Anasayfa'),
              const BottomNavigationBarItem(
                  icon: Icon(Icons.search_outlined),
                  activeIcon: Icon(Icons.search_rounded),
                  label: 'Yapgitsin'),
              const BottomNavigationBarItem(
                  icon: Icon(Icons.work_outline_rounded),
                  activeIcon: Icon(Icons.work_rounded),
                  label: 'İşlerim'),
              BottomNavigationBarItem(
                  icon: _MesajBadge(
                      icon: Icons.chat_bubble_outline_rounded,
                      count: ref.watch(unreadCountBadgeProvider)),
                  activeIcon: _MesajBadge(
                      icon: Icons.chat_bubble_rounded,
                      count: ref.watch(unreadCountBadgeProvider)),
                  label: 'Mesajlarım'),
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

/// Phase 500 — Mesajlarım bottom-nav badge.
/// 0 ise sadece icon, >0 ise sağ-üstte kırmızı sayı baloncuğu.
class _MesajBadge extends StatelessWidget {
  final IconData icon;
  final int count;
  const _MesajBadge({required this.icon, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return Icon(icon);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -8,
          top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: AppColors.error,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.surface, width: 1),
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
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Sayfa (Yaptır) sekmesi
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
    final q = query.trim();
    // Metinden kategori eşleştir — önce tam, sonra substring (her iki yön).
    String? matchedCategory;
    if (q.isNotEmpty) {
      ref.read(categoriesProvider).whenData((cats) {
        final lower = q.toLowerCase();
        for (final c in cats) {
          final name = ((c['name'] as String?) ?? '').toLowerCase();
          if (name == lower) {
            matchedCategory = c['name'] as String;
            return;
          }
        }
        for (final c in cats) {
          final name = ((c['name'] as String?) ?? '').toLowerCase();
          if (name.isEmpty) continue;
          if (name.contains(lower) || lower.contains(name)) {
            matchedCategory = c['name'] as String;
            return;
          }
        }
        // 3) Alt hizmet (subService) eşleşmesi — "musluk tamiri" → Tesisat,
        //    "ev temizliği" → Temizlik gibi serbest metinleri kategoriye bağlar.
        for (final c in cats) {
          final subs = (c['subServices'] as List?) ?? const [];
          for (final s in subs) {
            final sub = s.toString().toLowerCase();
            if (sub.isEmpty) continue;
            if (sub == lower || sub.contains(lower) || lower.contains(sub)) {
              matchedCategory = c['name'] as String;
              return;
            }
          }
        }
      });
    }
    if (!mounted) return;
    _searchController.clear();
    // Arama çubuğu artık doğrudan "Hizmet İlanı Ver" sayfasına yönlendirir.
    // Eşleşen kategori varsa otomatik seçilir; eşleşme yoksa/metin boşsa
    // kategorisiz açılır (kullanıcı elle seçer).
    final isLoggedIn = ref.read(authStateProvider) is AuthAuthenticated;
    if (!isLoggedIn) {
      context.push('/giris-yap', extra: {'returnTo': '/ilan-ver'});
      return;
    }
    final cat = matchedCategory;
    context.push(
      '/ilan-ver',
      extra: cat != null ? {'initialCategory': cat} : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final userName = authState is AuthAuthenticated ? authState.displayName : null;

    // Hero rengi temaya göre: Açık modda beyaz zemin + koyu metin;
    // Sistem/Koyu (dark) modda koyu tema arka planı + okunur açık ön plan.
    final heroBg = AppColors.surface;
    final heroTitle = AppColors.textPrimary;
    final heroGreeting = AppColors.textSecondary;
    final heroBadgeBg = AppColors.primary;

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
            // ── Hero SliverAppBar ──────────────────────────────────────
            SliverAppBar(
              expandedHeight: 280,
              pinned: true,
              backgroundColor: heroBg,
              foregroundColor: heroTitle,
              elevation: 0,
              actions: const [
                NotificationBell(),
                SizedBox(width: 4),
              ],
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.pin,
                background: Container(
                  // Hero zemini: content surface tonu (siyah üzerine siyah
                  // problemini çözmek için).
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, kToolbarHeight + 4, 20, 0),
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
                                      color: heroGreeting,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'En iyi Hizmet Veren, en iyi hizmet',
                                    style: GoogleFonts.playfairDisplay(
                                      color: heroTitle,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // Search bar
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.08),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: TextField(
                              controller: _searchController,
                              onSubmitted: _onSearch,
                              textInputAction: TextInputAction.search,
                              style: TextStyle(color: AppColors.textPrimary),
                              decoration: InputDecoration(
                                hintText: 'Hangi hizmete ihtiyacınız var?',
                                hintStyle: TextStyle(
                                    color: AppColors.textSecondary, fontSize: 14),
                                suffixIcon: IconButton(
                                  icon: const Icon(Icons.arrow_forward_rounded,
                                      color: AppColors.primary),
                                  onPressed: () =>
                                      _onSearch(_searchController.text),
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          // ── Hizmet İlanı Ver butonu — search'in hemen altında
                          ElevatedButton.icon(
                            // Buton da text-box filtresini kullanir: yazili metni
                            // _onSearch'e gecirir -> kategori eslesir, /ilan-ver o
                            // kategori secili acilir (giris kontrolu _onSearch'te).
                            onPressed: () =>
                                _onSearch(_searchController.text),
                            icon: Icon(Icons.add_circle_outline,
                                color: AppColors.textPrimary),
                            label: Text('Hizmet İlanı Ver',
                                style: TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.surfaceElevated,
                              foregroundColor: AppColors.primary,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(
                                      color: AppColors.border)),
                              elevation: 0,
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
                child: Text(
                  'Yapgitsin',
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    color: AppColors.success,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.0,
                  ),
                ),
              ),
            ),

            // Kullanıcı isteğiyle feed gizlendi (kategori/usta/ilan/AI sections).
            // Sadece hero header (logo + Merhaba + tagline + search + Hizmet
            // İlanı Ver butonu) görünür kalır. Geri açmak için bu sliver'a
            // _buildCategoriesSection / _buildFeaturedProvidersSection /
            // _buildRecentJobsSection / AiRecommendationsSection ekle.
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  // ─── Feed sections — hepsi prod API'sinden besleniyor ──────────────────────

  Widget _buildCategoriesSection() {
    final categoriesAsync = ref.watch(categoriesProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          hintKey: 'home.categoryStrip',
          title: 'Popüler Kategoriler',
          actionLabel: 'Tümünü Gör',
          onAction: () => Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => const ProviderListScreen()),
          ),
        ),
        const SizedBox(height: 10),
        categoriesAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
                height: 80,
                child: Center(
                    child: CircularProgressIndicator(strokeWidth: 2))),
          ),
          error: (_, __) => const SizedBox.shrink(),
          data: (cats) {
            final top = cats.take(8).toList();
            return SizedBox(
              height: 96,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: top.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, i) {
                  final c = top[i];
                  final name = (c['name'] as String?) ?? '';
                  final icon = (c['icon'] as String?) ?? '🔧';
                  return SizedBox(
                    width: 96,
                    child: CategoryCard(
                      label: name,
                      emoji: icon,
                      bgColor: AppColors.surfaceElevated,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              ProviderListScreen(initialSearch: name),
                        ),
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildFeaturedProvidersSection() {
    final providersAsync = ref.watch(allProvidersProvider(''));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          hintKey: 'home.featured',
          // Phase 472 terim kuralı: "Usta" → "Hizmet Verenler"
          title: 'Öne Çıkan Hizmet Verenler',
          actionLabel: 'Tümü',
          onAction: () => ref
              .read(selectedTabProvider.notifier)
              .state = 1, // HizmetAlScreen → Hizmet İlanları tab
        ),
        const SizedBox(height: 10),
        providersAsync.when(
          loading: () => const SizedBox(
              height: 180,
              child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2))),
          error: (_, __) => const SizedBox.shrink(),
          data: (providers) {
            // Öne çıkanları öne, sonra rating'e göre
            final sorted = [...providers]..sort((a, b) {
              final af = a['featuredOrder'] as int?;
              final bf = b['featuredOrder'] as int?;
              if (af != null && bf != null) return af.compareTo(bf);
              if (af != null) return -1;
              if (bf != null) return 1;
              final ar = (a['averageRating'] as num?) ?? 0;
              final br = (b['averageRating'] as num?) ?? 0;
              return br.compareTo(ar);
            });
            final top = sorted.take(8).toList();
            if (top.isEmpty) return const SizedBox.shrink();
            return SizedBox(
              height: 178,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: top.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (_, i) => _HomeProviderCard(provider: top[i]),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecentJobsSection(AsyncValue<List<Job>> jobsAsync) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          hintKey: 'home.recentJobs',
          title: 'Son İlanlar',
          actionLabel: 'Tümünü Gör',
          onAction: widget.onSeeAllRequests,
        ),
        const SizedBox(height: 10),
        jobsAsync.when(
          loading: () => const SizedBox(
              height: 100,
              child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2))),
          error: (_, __) => const SizedBox.shrink(),
          data: (jobs) {
            final open = jobs
                .where((j) => j.status == jp.JobStatus.OPEN)
                .take(5)
                .toList();
            if (open.isEmpty) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Text('Henüz açık ilan yok.',
                    style: TextStyle(
                        color: AppColors.textHint, fontSize: 13)),
              );
            }
            return Column(
              children: open.map((j) => GestureDetector(
                    // Phase 436 — tap → bottom sheet preview;
                    // long-press → full JobDetailScreen.
                    onTap: () =>
                        JobPreviewSheet.show(context, j.id, jobObj: j),
                    onLongPress: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => JobDetailScreen(
                          id: j.id,
                          title: j.title,
                          description: j.desc,
                          location: j.location,
                          budget: j.budget,
                          category: j.category,
                          postedAt: j.time,
                          icon: j.icon,
                          color: j.color,
                          isFeatured: j.isFeatured,
                          customerId: j.customerId,
                        ),
                      ),
                    ),
                    child: _RecentJobRow(job: j),
                  )).toList(),
            );
          },
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

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı widget'lar
// ─────────────────────────────────────────────────────────────────────────────

/// Recent job row for home screen — uses JobStatusBadge
/// Phase 410 — Phase 408 ConsumerWidget + "Öne Çıkar" konditional içerik
/// kaldırıldı. User raporu: Phase 408'den beri "ilan tıklayınca boşa düşüyor".
/// ref.watch içeren conditional rozet, Row+Column intrinsic ölçüm pass'inde
/// JobDetailScreen push olurken layout hatası tetikliyordu. Stateless'a dön.
class _RecentJobRow extends StatelessWidget {
  final Job job;
  const _RecentJobRow({required this.job});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
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
                  style: TextStyle(
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
                    Icon(Icons.location_on_rounded,
                        size: 11, color: AppColors.textHint),
                    const SizedBox(width: 2),
                    Expanded(
                      child: Text(
                        job.location,
                        style: TextStyle(
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

/// Home feed öne çıkan usta kartı (horizontal carousel)
class _HomeProviderCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  const _HomeProviderCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final user = provider['user'] as Map<String, dynamic>?;
    final name =
        (provider['businessName'] ?? user?['fullName'] ?? '').toString();
    final rating = (provider['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (provider['totalReviews'] as num?)?.toInt() ?? 0;
    final isVerified = provider['isVerified'] == true ||
        provider['identityVerified'] == true;
    final cats = provider['workerCategories'];
    final firstCat = cats is List && cats.isNotEmpty
        ? cats.first.toString()
        : '';
    final initials = name.isNotEmpty
        ? trUpper(name
            .split(' ')
            .take(2)
            .map((w) => w.isNotEmpty ? w[0] : '')
            .join())
        : '?';
    final isFeatured = provider['featuredOrder'] != null;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              ProviderProfileScreen(providerId: provider['id'].toString()),
        ),
      ),
      child: Container(
        width: 158,
        padding: const EdgeInsets.all(12),
        // Phase 344 — Yapgitsin 3D card pattern; featured ise amber border.
        decoration: isFeatured
            ? card3d(context, radius: 16, elevation: 1.2).copyWith(
                border: Border.all(
                    color: Colors.amber.shade400.withValues(alpha: 0.6),
                    width: 0.6),
              )
            : card3d(context, radius: 16, elevation: 1.2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                      child: Text(initials,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.primary)),
                    ),
                    if (isVerified)
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: const BoxDecoration(
                              color: Colors.blue, shape: BoxShape.circle),
                          child: const Icon(Icons.check,
                              size: 9, color: Colors.white),
                        ),
                      ),
                  ],
                ),
                if (isFeatured) ...[
                  const Spacer(),
                  Icon(Icons.workspace_premium_rounded,
                      color: Colors.amber.shade400, size: 16),
                ],
              ],
            ),
            const SizedBox(height: 10),
            Text(name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.textPrimary)),
            if (firstCat.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(firstCat,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 11, color: AppColors.textHint)),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.star_rounded,
                    size: 14, color: Colors.amber.shade400),
                const SizedBox(width: 3),
                Text(rating.toStringAsFixed(1),
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary)),
                const SizedBox(width: 3),
                Text('($reviews)',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textHint)),
              ],
            ),
          ],
        ),
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
          color: isActive ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.border,
            width: 1.5,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.2),
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
            color: isActive ? Colors.black : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

