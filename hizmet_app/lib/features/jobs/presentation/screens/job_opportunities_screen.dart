import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/card_3d.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../categories/data/category_repository.dart';
import '../../../notifications/data/unread_count_provider.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../data/job_filter.dart';
import '../../data/offer_repository.dart';
import '../../widgets/job_filter_sheet.dart';
import '../providers/job_provider.dart';
import 'job_detail_screen.dart';

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class JobOpportunitiesBody extends JobOpportunitiesScreen {
  const JobOpportunitiesBody({super.key}) : super(showAppBar: false);
}

/// Usta için açık ilanlar (bid verebileceği işler)
class JobOpportunitiesScreen extends ConsumerStatefulWidget {
  final bool showAppBar;
  const JobOpportunitiesScreen({super.key, this.showAppBar = true});

  @override
  ConsumerState<JobOpportunitiesScreen> createState() => _JobOpportunitiesScreenState();
}

class _JobOpportunitiesScreenState extends ConsumerState<JobOpportunitiesScreen> {
  bool get _showAppBar => widget.showAppBar;

  String? _activeCategory;
  String _searchQuery = '';
  Timer? _debounce;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _applyProximity();
  }

  /// Map'te zaten verilmiş konum iznini yeniden kullanır (yeni izin istemez);
  /// varsa konumu provider'a geçirir → fırsatlar yakınlığa göre sıralanır.
  Future<void> _applyProximity() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 6));
      if (!mounted) return;
      ref
          .read(jobsProvider.notifier)
          .setLocation(pos.latitude, pos.longitude);
    } catch (_) {
      // konum alınamazsa sessiz geç — liste normal sırada kalır
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _selectCategory(String? category) {
    setState(() => _activeCategory = category);
    ref.read(jobsProvider.notifier).fetchJobs(
          category: category,
          q: _searchQuery.isEmpty ? null : _searchQuery,
        );
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _searchQuery = value.trim();
      ref.read(jobsProvider.notifier).setQuery(_searchQuery);
    });
  }

  Future<void> _openFilterSheet() async {
    final current = ref.read(jobFilterProvider);
    final result = await showModalBottomSheet<JobFilter>(
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => JobFilterSheet(initial: current),
    );
    if (result != null) {
      ref.read(jobFilterProvider.notifier).state = result;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final jobsAsync = ref.watch(jobsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final activeFilterCount = ref.watch(jobFilterProvider).activeCount;

    final myCategories = authState is AuthAuthenticated
        ? _parseWorkerCategories(authState.user['workerCategories'])
        : <String>[];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _showAppBar
          ? AppBar(
              title: const Text('Yapgitsin'),
              backgroundColor: AppColors.background,
              foregroundColor: AppColors.textPrimary,
              elevation: 0,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.read(jobsProvider.notifier).fetchJobs(),
                ),
              ],
            )
          : null,
      body: Column(
        children: [
          _buildSearchAndFilter(categoriesAsync, activeFilterCount, myCategories),
          Expanded(
            child: jobsAsync.when(
              loading: () => ListSkeleton(
                  itemCount: 6, itemBuilder: (_) => const JobCardSkeleton()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.wifi_off_rounded,
                          size: 40, color: AppColors.error),
                    ),
                    const SizedBox(height: 16),
                    Text('Bağlantı hatası',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 15)),
                    const SizedBox(height: 6),
                    Text('$e',
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () => ref.read(jobsProvider.notifier).fetchJobs(),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10))),
                      icon: const Icon(Icons.refresh_rounded, size: 16),
                      label: const Text('Yenile'),
                    ),
                  ],
                ),
              ),
              data: (jobs) {
                final myUserId = authState is AuthAuthenticated
                    ? authState.user['id'] as String?
                    : null;

                // Sadece açık ilanlar. Kendi ilanlarım da listede görünür —
                // kartta "Teklif Ver" yerine "Bu sizin ilanınız" rozeti çıkar
                // (kendine teklif verilemez).
                var filtered = jobs
                    .where((j) => j.status == JobStatus.OPEN)
                    .toList();

                // Fırsat ilanları sıralaması:
                // 1) workerCategories'ime uyan önce
                // 2) createdAt DESC (en yeni)
                // 3) budget DESC (yüksek fiyatlı önce)
                // 4) responseCount=0 önce (rekabet az) — şu an Job
                //    model'inde responseCount yok; offers fetch ileride
                //    eklenebilir. Bu skorda createdAt/budget yeterli.
                final mySet = myCategories.toSet();
                filtered.sort((a, b) {
                  final aMine = mySet.contains(a.category) ? 0 : 1;
                  final bMine = mySet.contains(b.category) ? 0 : 1;
                  if (aMine != bMine) return aMine - bMine;

                  final aDate = a.createdAt ?? '';
                  final bDate = b.createdAt ?? '';
                  final dateCmp = bDate.compareTo(aDate);
                  if (dateCmp != 0) return dateCmp;

                  final aBudget = a.budgetMax ?? a.budgetMin ?? 0;
                  final bBudget = b.budgetMax ?? b.budgetMin ?? 0;
                  return bBudget.compareTo(aBudget);
                });

                if (filtered.isEmpty) {
                  return _buildEmptyState();
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(jobsProvider.notifier).fetchJobs(
                        category: _activeCategory,
                        q: _searchQuery.isEmpty ? null : _searchQuery,
                      ),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 12),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (ctx, i) =>
                        _OpportunityCard(job: filtered[i], myUserId: myUserId),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  /// Search bar + filter button + kategori grid (hizmet ilanları paritesi).
  /// Worker'ın workerCategories'ini "Uzmanlık Alanlarım" başlığı altında
  /// önce gösterir, ardından "Diğer Kategoriler" altında geri kalanı.
  Widget _buildSearchAndFilter(
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
    int activeFilterCount,
    List<String> myCategories,
  ) {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(10, 4, 10, 6),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Yapgitsin\'de ara...',
                      hintStyle: TextStyle(color: AppColors.textHint, fontSize: 13),
                      prefixIcon:
                          Icon(Icons.search, color: AppColors.textHint, size: 18),
                      prefixIconConstraints: const BoxConstraints(
                          minWidth: 32, minHeight: 32),
                      isDense: true,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              _filterButton(activeFilterCount),
              const SizedBox(width: 6),
              _notifButton(context),
            ],
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: 28,
            child: categoriesAsync.when(
              data: (cats) {
                final mySet = myCategories.toSet();
                final mine = cats
                    .where((c) => mySet.contains(c['name']))
                    .toList();
                final others = cats
                    .where((c) => !mySet.contains(c['name']))
                    .toList();
                return ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _chip('Tümü', null, _activeCategory == null),
                    ...mine.map((c) => _chip(
                          '${c['icon'] ?? ''} ${c['name'] ?? ''}'.trim(),
                          c['name'] as String?,
                          _activeCategory == c['name'],
                        )),
                    if (mine.isNotEmpty && others.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        width: 1,
                        height: 22,
                        color: AppColors.border,
                      ),
                    ...others.map((c) => _chip(
                          '${c['icon'] ?? ''} ${c['name'] ?? ''}'.trim(),
                          c['name'] as String?,
                          _activeCategory == c['name'],
                        )),
                  ],
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, String? value, bool active) =>
      GestureDetector(
        onTap: () => _selectCategory(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: active ? Colors.white : AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: active ? Colors.white : AppColors.border),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active ? Colors.black : AppColors.textPrimary,
            ),
          ),
        ),
      );

  Widget _notifButton(BuildContext context) {
    final count = ref.watch(unreadCountBadgeProvider);
    final loggedIn = ref.watch(authStateProvider) is AuthAuthenticated;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationScreen()),
            ),
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              child: Icon(Icons.notifications_outlined,
                  color: AppColors.textPrimary, size: 22),
            ),
          ),
        ),
        if (loggedIn && count > 0)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              constraints:
                  const BoxConstraints(minWidth: 18, minHeight: 18),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.background, width: 1.5),
              ),
              child: Text(count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ),
          ),
      ],
    );
  }

  Widget _filterButton(int activeCount) {
    final hasActive = activeCount > 0;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: hasActive ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: _openFilterSheet,
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              child: Icon(Icons.tune_rounded,
                  color: hasActive ? Colors.black : AppColors.textPrimary,
                  size: 22),
            ),
          ),
        ),
        if (hasActive)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              constraints:
                  const BoxConstraints(minWidth: 18, minHeight: 18),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.background, width: 1.5),
              ),
              child: Text('$activeCount',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyState() {
    final hasSearch = _searchQuery.isNotEmpty || _activeCategory != null;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(
                hasSearch
                    ? Icons.search_off_rounded
                    : Icons.work_off_rounded,
                size: 48,
                color: AppColors.primary.withValues(alpha: 0.5)),
          ),
          const SizedBox(height: 18),
          Text(hasSearch ? 'Sonuç bulunamadı' : 'Bu kategoride açık ilan yok.',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 15)),
          const SizedBox(height: 6),
          Text('Farklı bir kategori ya da kelime deneyin.',
              style: TextStyle(color: AppColors.textHint, fontSize: 13)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () {
              setState(() {
                _activeCategory = null;
                _searchQuery = '';
                _searchController.clear();
              });
              ref.read(jobsProvider.notifier).fetchJobs();
            },
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.primary),
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.grid_view_rounded, size: 16),
            label: const Text('Tüm Kategorilere Bak'),
          ),
        ],
      ),
    );
  }
}

/// workerCategories alanını List veya JSON-string formatından güvenle çözer.
/// SQLite simple-json öncesi seed kullanıcılarda string olarak gelebiliyor.
List<String> _parseWorkerCategories(dynamic raw) {
  if (raw is List) {
    return raw.map((e) => e.toString()).toList();
  }
  if (raw is String && raw.isNotEmpty) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.map((e) => e.toString()).toList();
      }
    } catch (_) {
      // JSON değilse virgüllü split fallback
      return raw
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }
  }
  return const <String>[];
}

// ─── İlan kartı ───────────────────────────────────────────────────────────────

class _OpportunityCard extends ConsumerWidget {
  final Job job;
  final String? myUserId;
  const _OpportunityCard({required this.job, this.myUserId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersAsync = ref.watch(jobOffersProvider(job.id));
    final offerCount  = offersAsync.maybeWhen(data: (o) => o.length, orElse: () => 0);
    final isOwner = myUserId != null && job.customerId == myUserId;

    final budgetStr = (job.budgetMin != null && job.budgetMax != null)
        ? '${job.budgetMin!.toInt()} – ${job.budgetMax!.toInt()} ₺'
        : job.budgetMin != null ? '${job.budgetMin!.toInt()} ₺~' : 'Belirtilmemiş';

    final postedAgo = job.createdAt != null
        ? _timeAgo(job.createdAt!)
        : '';

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => Navigator.push(context, MaterialPageRoute(
        builder: (_) => JobDetailScreen(
          id: job.id,
          title: job.title,
          description: job.description ?? '',
          location: job.location,
          budget: budgetStr,
          category: job.category,
          postedAt: postedAgo,
          icon: Job.getIconForCategory(job.category),
          color: Job.getColorForCategory(job.category),
          isFeatured: job.featuredOrder != null,
          customerId: job.customerId,
          photos: job.photos ?? [],
        ),
      )),
      child: Container(
        // Phase 265c — 3D sıkılaştırılmış kart efekti (theme-aware).
        decoration: card3d(context, radius: 12, elevation: 1.0),
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Kategori ikonu
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: job.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(job.icon, color: job.color, size: 18),
            ),
            const SizedBox(width: 10),
            // Başlık + meta + alt satır
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(job.title,
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppColors.textPrimary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(budgetStr,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 10)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(job.description ?? '',
                      style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                          height: 1.3),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(Icons.location_on_rounded,
                        size: 11, color: AppColors.textHint),
                    const SizedBox(width: 2),
                    Expanded(
                      child: Text(job.location,
                          style: TextStyle(
                              fontSize: 10, color: AppColors.textHint),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                    const SizedBox(width: 4),
                    Text('· $postedAgo',
                        style: TextStyle(
                            fontSize: 10, color: AppColors.textHint)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: offerCount > 0
                            ? AppColors.primary.withValues(alpha: 0.12)
                            : AppColors.border,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.people_rounded,
                              size: 10,
                              color: offerCount > 0
                                  ? AppColors.primary
                                  : AppColors.textHint),
                          const SizedBox(width: 2),
                          Text('$offerCount',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: offerCount > 0
                                      ? AppColors.primary
                                      : AppColors.textHint,
                                  fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                    if (isOwner) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Sizin',
                            style: TextStyle(
                                fontSize: 9,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w700)),
                      ),
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

  String _timeAgo(String iso) {
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60)  return '${diff.inMinutes} dk önce';
      if (diff.inHours   < 24)  return '${diff.inHours} saat önce';
      return '${diff.inDays} gün önce';
    } catch (_) {
      return '';
    }
  }
}
