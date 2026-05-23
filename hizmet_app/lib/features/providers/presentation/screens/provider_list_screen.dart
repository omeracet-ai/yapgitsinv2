import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../categories/data/category_repository.dart';
import '../../../users/widgets/badge_row.dart';
import '../../../users/widgets/favorite_button.dart';
import '../../data/provider_repository.dart';
import '../../data/recent_searches_storage.dart';
import '../../data/worker_filter.dart';
import '../../widgets/worker_filter_sheet.dart';
import '../../../subscriptions/data/category_subscription_repository.dart';
import 'provider_profile_screen.dart';

class ProviderListScreen extends ConsumerStatefulWidget {
  final String? initialSearch;
  const ProviderListScreen({super.key, this.initialSearch});

  @override
  ConsumerState<ProviderListScreen> createState() => _ProviderListScreenState();
}

class _ProviderListScreenState extends ConsumerState<ProviderListScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String? _activeCategory;
  _SortMode _sort = _SortMode.smart;
  List<RecentSearch> _recentSearches = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialSearch?.isNotEmpty == true) {
      _search = widget.initialSearch!;
      _activeCategory = widget.initialSearch;
      _searchCtrl.text = widget.initialSearch!;
    }
    _loadRecent();
  }

  Future<void> _loadRecent() async {
    final list = await RecentSearchesStorage.load();
    if (mounted) setState(() => _recentSearches = list);
  }

  Future<void> _saveRecent({String? category}) async {
    final filter = ref.read(workerFilterProvider);
    final cat = category ?? _activeCategory;
    // Boş arama kaydetme (hiç filtre + kategori yok)
    if ((cat == null || cat.isEmpty) && filter.isEmpty) return;
    final updated = await RecentSearchesStorage.add(RecentSearch(
      category: cat,
      minRating: filter.minRating,
      sortBy: filter.sortBy,
      savedAt: DateTime.now(),
    ));
    if (mounted) setState(() => _recentSearches = updated);
  }

  Future<void> _removeRecent(String key) async {
    final updated = await RecentSearchesStorage.remove(key);
    if (mounted) setState(() => _recentSearches = updated);
  }

  void _applyRecent(RecentSearch r) {
    setState(() {
      _activeCategory = r.category;
      _search = r.category ?? '';
      _searchCtrl.text = r.category ?? '';
    });
    ref.read(workerFilterProvider.notifier).state = WorkerFilter(
      minRating: r.minRating,
      sortBy: r.sortBy,
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _openFilterSheet() async {
    final current = ref.read(workerFilterProvider);
    final result = await showModalBottomSheet<WorkerFilter>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => WorkerFilterSheet(initial: current),
    );
    if (result != null && mounted) {
      ref.read(workerFilterProvider.notifier).state = result;
      await _saveRecent();
    }
  }

  void _selectCategory(String? cat) {
    setState(() {
      if (_activeCategory == cat) {
        _activeCategory = null;
        _search = '';
        _searchCtrl.clear();
      } else {
        _activeCategory = cat;
        _search = cat ?? '';
        _searchCtrl.text = cat ?? '';
      }
    });
    if (cat != null && cat.isNotEmpty) {
      _saveRecent(category: cat);
    }
  }

  @override
  Widget build(BuildContext context) {
    final providersAsync = ref.watch(allProvidersProvider(_search));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [_buildAppBar(ctx)],
        body: providersAsync.when(
          loading: () => ListSkeleton(
            itemCount: 6,
            itemBuilder: (_) => const ProviderCardSkeleton(),
          ),
          error: (e, _) => _errorState(e.toString()),
          data: (providers) => _buildList(providers),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      pinned: false,
      floating: false,
      snap: false,
      backgroundColor: Colors.transparent,
      foregroundColor: Colors.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      flexibleSpace: ColoredBox(color: AppColors.background),
      title: const Text(
        'Ustalar',
        style: TextStyle(
            color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(112),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            children: [
              // Search bar
              Container(
                decoration: BoxDecoration(color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 3))
                  ],
                ),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() {
                    _search = v.trim();
                    _activeCategory = null;
                  }),
                  decoration: InputDecoration(
                    hintText: 'İsim veya hizmet ara...',
                    hintStyle:
                        TextStyle(color: AppColors.textHint, fontSize: 14),
                    prefixIcon: Icon(Icons.search,
                        color: AppColors.textHint, size: 20),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() {
                              _searchCtrl.clear();
                              _search = '';
                              _activeCategory = null;
                            }),
                          )
                        : null,
                    
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              // Category chips
              SizedBox(
                height: 34,
                child: ref.watch(categoriesProvider).when(
                  data: (cats) => ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _chip('Tümü', null, _activeCategory == null),
                      ...cats.map((c) {
                        final n = c['name'] as String? ?? '';
                        final e = c['icon'] as String? ?? '';
                        return _chip('$e $n'.trim(), n, _activeCategory == n);
                      }),
                    ],
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String label, String? value, bool active) => GestureDetector(
        onTap: () => _selectCategory(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: active
                ? AppColors.primaryLight
                : Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: active
                  ? AppColors.primaryLight
                  : Colors.white.withValues(alpha: 0.30),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active ? AppColors.primaryDark : Colors.white,
            ),
          ),
        ),
      );

  // ── Filter helpers ──────────────────────────────────────────────────────

  /// Provider'ın saatlik ücretini TL olarak döner — minor (kuruş) öncelikli,
  /// yoksa legacy hourlyRateMin'e düşer. Eksikse +∞ (rate sort'ta en sona).
  double _rateOf(Map<String, dynamic> p) {
    final minor = p['hourlyRateMinMinor'] as num?;
    if (minor != null) return minor / 100.0;
    final legacy = p['hourlyRateMin'] as num?;
    if (legacy != null) return legacy.toDouble();
    return double.infinity;
  }

  /// Haversine — provider lat/lng ile origin arası km.
  double _distanceKm(Map<String, dynamic> p, double oLat, double oLng) {
    final lat = (p['latitude'] as num?)?.toDouble();
    final lng = (p['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) return double.infinity;
    const r = 6371.0;
    final dLat = (lat - oLat) * math.pi / 180.0;
    final dLng = (lng - oLng) * math.pi / 180.0;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(oLat * math.pi / 180.0) *
            math.cos(lat * math.pi / 180.0) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  bool _matchesCategory(Map<String, dynamic> p, String category) {
    final cats = p['workerCategories'];
    if (cats is List) {
      return cats.any((c) =>
          c.toString().toLowerCase() == category.toLowerCase());
    }
    if (cats is String) {
      return cats.toLowerCase().contains(category.toLowerCase());
    }
    return false;
  }

  /// Tüm filter koşullarını client-side uygular: kategori, rate range, geo,
  /// rating, verified, available, semantic substring.
  List<Map<String, dynamic>> _applyClientFilters(
    List<Map<String, dynamic>> input,
    WorkerFilter f,
  ) {
    Iterable<Map<String, dynamic>> r = input;

    // Active category chip
    if (_activeCategory != null && _activeCategory!.isNotEmpty) {
      r = r.where((p) => _matchesCategory(p, _activeCategory!));
    }
    // Minimum rating
    if (f.minRating != null) {
      r = r.where((p) =>
          ((p['averageRating'] as num?) ?? 0).toDouble() >= f.minRating!);
    }
    // Sadece doğrulanmış
    if (f.verifiedOnly) {
      r = r.where((p) =>
          p['isVerified'] == true || p['identityVerified'] == true);
    }
    // Sadece müsait
    if (f.availableOnly) {
      r = r.where((p) => p['isAvailable'] == true);
    }
    // Ücret aralığı (TL)
    if (f.minRate != null) {
      r = r.where((p) => _rateOf(p) >= f.minRate!);
    }
    if (f.maxRate != null) {
      r = r.where((p) {
        final rate = _rateOf(p);
        return rate.isFinite && rate <= f.maxRate!;
      });
    }
    // Geo radius
    if (f.nearMe && f.userLat != null && f.userLng != null) {
      r = r.where(
          (p) => _distanceKm(p, f.userLat!, f.userLng!) <= f.radiusKm);
    }
    // Semantic — basit substring match (bio + categories)
    final sem = f.semanticQuery?.trim().toLowerCase();
    if (sem != null && sem.isNotEmpty) {
      r = r.where((p) {
        final bio = (p['bio'] ?? p['workerBio'] ?? '').toString().toLowerCase();
        if (bio.contains(sem)) return true;
        final cats = p['workerCategories'];
        if (cats is List) {
          return cats.any((c) => c.toString().toLowerCase().contains(sem));
        }
        return false;
      });
    }
    return r.toList();
  }

  Widget _buildList(List<Map<String, dynamic>> rawProviders) {
    // ── Client-side filter pipeline ─────────────────────────────────────────
    // Backend bazı filtreleri uygulamıyor (rate range, geo, category, semantic).
    // WorkerFilter + active category chip hepsini burada uyguluyoruz.
    final filter = ref.watch(workerFilterProvider);
    final providers = _applyClientFilters(rawProviders, filter);

    if (providers.isEmpty) {
      final hasFilter = _search.isNotEmpty ||
          _activeCategory != null ||
          !filter.isEmpty;
      return EmptyState(
        icon: Icons.person_search_rounded,
        title: hasFilter
            ? 'Bu kriterlere uygun usta bulunamadı'
            : 'Henüz usta yok',
        message: hasFilter
            ? 'Filtreleri değiştirip tekrar dene.'
            : 'Yakında bölgenize uygun ustalar burada listelenecek.',
        action: hasFilter
            ? OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _search = '';
                    _activeCategory = null;
                    _searchCtrl.clear();
                  });
                  ref.read(workerFilterProvider.notifier).state =
                      WorkerFilter.empty;
                },
                icon: const Icon(Icons.clear),
                label: const Text('Filtreleri Temizle'),
              )
            : null,
      );
    }

    final featured =
        providers.where((p) => p['featuredOrder'] != null).toList()
          ..sort((a, b) =>
              (a['featuredOrder'] as int).compareTo(b['featuredOrder'] as int));
    final regular =
        providers.where((p) => p['featuredOrder'] == null).toList();

    // Sort regular list — filter sheet'in sortBy'ı rate/nearest seçtiyse
    // önceliği ona ver; aksi halde üstteki chip (_sort) belirler.
    switch (filter.sortBy) {
      case WorkerSortBy.rateAsc:
        regular.sort((a, b) => _rateOf(a).compareTo(_rateOf(b)));
        break;
      case WorkerSortBy.rateDesc:
        regular.sort((a, b) => _rateOf(b).compareTo(_rateOf(a)));
        break;
      case WorkerSortBy.nearest:
        if (filter.nearMe && filter.userLat != null && filter.userLng != null) {
          regular.sort((a, b) {
            final da = _distanceKm(a, filter.userLat!, filter.userLng!);
            final db = _distanceKm(b, filter.userLat!, filter.userLng!);
            return da.compareTo(db);
          });
        }
        break;
      case WorkerSortBy.smart:
      case WorkerSortBy.rating:
      case WorkerSortBy.reputation:
        // Local chip kazanır
        switch (_sort) {
          case _SortMode.smart:
            // Phase 261 — Adil sıralama: Wilson skoru (güven) önce, eşitlikte puan.
            regular.sort((a, b) {
              final wb = (b['wilsonScore'] as num?) ?? 0;
              final wa = (a['wilsonScore'] as num?) ?? 0;
              final c = wb.compareTo(wa);
              if (c != 0) return c;
              return ((b['averageRating'] as num?) ?? 0)
                  .compareTo((a['averageRating'] as num?) ?? 0);
            });
            break;
          case _SortMode.rating:
            regular.sort((a, b) => ((b['averageRating'] as num?) ?? 0)
                .compareTo((a['averageRating'] as num?) ?? 0));
            break;
          case _SortMode.reviews:
            regular.sort((a, b) => ((b['totalReviews'] as num?) ?? 0)
                .compareTo((a['totalReviews'] as num?) ?? 0));
            break;
        }
        break;
    }

    final showRecent = _search.isEmpty &&
        _activeCategory == null &&
        _recentSearches.isNotEmpty;

    return CustomScrollView(
      slivers: [
        if (showRecent) SliverToBoxAdapter(child: _buildRecentSearches()),
        // Phase 143 — kategori aboneliği toggle
        if (_activeCategory != null && _activeCategory!.isNotEmpty)
          SliverToBoxAdapter(child: _buildSubscribeBanner(_activeCategory!)),
        // Sort bar — sayım üstte, chip'ler altta tam genişlikte yatay scroll
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${providers.length} usta bulundu',
                    style: TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 32,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _sortChip(_SortMode.smart, 'Adil Sıralama'),
                      const SizedBox(width: 8),
                      _sortChip(_SortMode.rating, 'En Yüksek Puan'),
                      const SizedBox(width: 8),
                      _sortChip(_SortMode.reviews, 'En Çok Yorum'),
                      const SizedBox(width: 8),
                      _filterChip(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Featured horizontal carousel
        if (featured.isNotEmpty && _search.isEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                          colors: [Colors.amber.shade400, Colors.amber.shade600]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.workspace_premium_rounded,
                            color: Colors.white, size: 13),
                        SizedBox(width: 4),
                        Text('Öne Çıkan Ustalar',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(left: 16, right: 4),
                itemCount: featured.length,
                itemBuilder: (_, i) => _FeaturedCard(provider: featured[i]),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Row(
                children: [
                  const Text('Tüm Ustalar',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  Text('(${regular.length})',
                      style: TextStyle(
                          fontSize: 13, color: AppColors.textHint)),
                ],
              ),
            ),
          ),
        ],

        // Regular list
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, i) => _ProviderCard(provider: regular[i]),
              childCount: regular.length,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentSearches() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.history_rounded,
                  size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text('Son Aramalar',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const Spacer(),
              GestureDetector(
                onTap: () async {
                  await RecentSearchesStorage.clear();
                  if (mounted) setState(() => _recentSearches = []);
                },
                child: const Text('Tümünü Sil',
                    style: TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _recentSearches.map((r) {
              return InkWell(
                onTap: () => _applyRecent(r),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(12, 6, 4, 6),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.25)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(r.summary,
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary)),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: () => _removeRecent(r.dedupKey),
                        borderRadius: BorderRadius.circular(20),
                        child: const Padding(
                          padding: EdgeInsets.all(4),
                          child: Icon(Icons.close,
                              size: 12, color: AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  /// Filter butonu — sort chip'lerin yanına gömülü, badge'li.
  /// Badge: filter sheet aktifleri + (varsa) kategori chip = toplam.
  Widget _filterChip() {
    final filterCount = ref.watch(workerFilterProvider).activeCount;
    final categoryCount =
        (_activeCategory != null && _activeCategory!.isNotEmpty) ? 1 : 0;
    final activeCount = filterCount + categoryCount;
    final hasActive = activeCount > 0;
    return GestureDetector(
      onTap: _openFilterSheet,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: hasActive
                  ? AppColors.primary
                  : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: hasActive ? AppColors.primary : AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.tune_rounded,
                    size: 13,
                    color:
                        hasActive ? Colors.white : AppColors.textPrimary),
                const SizedBox(width: 4),
                Text('Filtre',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: hasActive
                            ? Colors.white
                            : AppColors.textPrimary)),
              ],
            ),
          ),
          if (hasActive)
            Positioned(
              top: -4,
              right: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                constraints:
                    const BoxConstraints(minWidth: 14, minHeight: 14),
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white, width: 1.2),
                ),
                child: Text('$activeCount',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _sortChip(_SortMode mode, String label) {
    final active = _sort == mode;
    return GestureDetector(
      onTap: () => setState(() => _sort = mode),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: active ? AppColors.primary : AppColors.border),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : AppColors.textPrimary)),
      ),
    );
  }

  Widget _errorState(String msg) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(msg, style: TextStyle(color: AppColors.textHint)),
          ],
        ),
      );

  // Phase 143 — kategori aboneliği banner: subscribe / unsubscribe toggle
  Widget _buildSubscribeBanner(String category) {
    final async = ref.watch(categorySubscriptionsProvider);
    return async.maybeWhen(
      orElse: () => const SizedBox.shrink(),
      data: (subs) {
        final existing = subs.where((s) =>
            s.category.toLowerCase() == category.toLowerCase() &&
            (s.city == null || s.city!.isEmpty)).toList();
        final isSubscribed = existing.isNotEmpty;
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Material(
            color: isSubscribed ? AppColors.primaryLight : AppColors.accent,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () async {
                final repo = ref.read(categorySubscriptionRepositoryProvider);
                try {
                  if (isSubscribed) {
                    await repo.unsubscribe(existing.first.id);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Abonelik iptal edildi')),
                      );
                    }
                  } else {
                    await repo.subscribe(category);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(
                                '🔔 $category aboneliği oluşturuldu — yeni ilanlar bildirilecek')),
                      );
                    }
                  }
                  // ignore: unused_result
                  ref.refresh(categorySubscriptionsProvider);
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('İşlem başarısız: $e')),
                    );
                  }
                }
              },
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    Icon(
                      isSubscribed
                          ? Icons.notifications_active
                          : Icons.notifications_none,
                      color: isSubscribed ? AppColors.primary : Colors.white,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        isSubscribed
                            ? '✓ "$category" aboneliği aktif'
                            : '🔔 "$category" için bu aramaya abone ol',
                        style: TextStyle(
                          color:
                              isSubscribed ? AppColors.primary : Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      isSubscribed ? 'İptal Et' : 'Abone Ol',
                      style: TextStyle(
                        color: isSubscribed ? AppColors.primary : Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

enum _SortMode { smart, rating, reviews }

// ─── Featured Card (horizontal carousel) ─────────────────────────────────────

class _FeaturedCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  const _FeaturedCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final user = provider['user'] as Map<String, dynamic>?;
    final name = (provider['businessName'] ?? user?['fullName'] ?? '').toString();
    final bio = (provider['bio'] ?? '').toString();
    final rating = (provider['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (provider['totalReviews'] as num?)?.toInt() ?? 0;
    final isVerified = provider['isVerified'] == true;
    final cats = provider['categories'] as List? ?? [];
    final initials = name.isNotEmpty
        ? trUpper(name.split(' ').take(2).map((w) => w.isNotEmpty ? w[0] : '').join())
        : '?';

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderProfileScreen(providerId: provider['id'].toString()),
      )),
      child: Container(
        width: 170,
        margin: const EdgeInsets.only(right: 12, bottom: 4),
        decoration: BoxDecoration(color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.amber.shade300, width: 1.5),
          boxShadow: [
            BoxShadow(
                color: Colors.amber.withValues(alpha: 0.12),
                blurRadius: 12,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Stack(
          children: [
            if ((user?['id']?.toString() ?? '').isNotEmpty)
              Positioned(
                top: 4,
                right: 4,
                child: FavoriteButton(
                    workerId: user!['id'].toString(), size: 18),
              ),
            Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: Colors.amber.shade100,
                    child: Text(initials,
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade800)),
                  ),
                  if (isVerified)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: const BoxDecoration(
                            color: Colors.blue, shape: BoxShape.circle),
                        child: const Icon(Icons.check, size: 12, color: Colors.white),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(name,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.star_rounded, size: 13, color: Colors.amber.shade600),
                  const SizedBox(width: 2),
                  Text(rating.toStringAsFixed(1),
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                  Text(' ($reviews)', style: TextStyle(fontSize: 11, color: AppColors.textHint)),
                ],
              ),
              if (bio.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(bio,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: AppColors.textHint)),
              ],
              if (cats.isNotEmpty) ...[
                const Spacer(),
                Text(cats.take(2).join(' · '),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w500)),
              ],
            ],
          ),
        ),
          ],
        ),
      ),
    );
  }
}

// ─── Regular Provider Card ────────────────────────────────────────────────────

class _ProviderCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  const _ProviderCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final user = provider['user'] as Map<String, dynamic>?;
    final name = (provider['businessName'] ?? user?['fullName'] ?? '').toString();
    final bio = (provider['bio'] ?? '').toString();
    final rating = (provider['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (provider['totalReviews'] as num?)?.toInt() ?? 0;
    // Phase 261 — Wilson 95% CI lower bound (0-1) → "Güven Skoru" mikro göstergesi
    final wilson = (provider['wilsonScore'] as num?)?.toDouble() ?? 0.0;
    final isVerified = provider['isVerified'] == true;
    final isAvailable = provider['isAvailable'] == true;
    final cats = provider['categories'] as List? ?? [];
    final badges = (provider['badges'] as List?) ??
        (user?['badges'] as List?);
    final rateMin = (provider['hourlyRateMin'] as num?)?.toInt();
    final rateMax = (provider['hourlyRateMax'] as num?)?.toInt();
    final initials = name.isNotEmpty
        ? trUpper(name.split(' ').take(2).map((w) => w.isNotEmpty ? w[0] : '').join())
        : '?';

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderProfileScreen(providerId: provider['id'].toString()),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              Stack(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primaryLight,
                    child: Text(initials,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.primary)),
                  ),
                  if (isAvailable)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                  if (isVerified && !isAvailable)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: const BoxDecoration(
                            color: Colors.blue, shape: BoxShape.circle),
                        child: const Icon(Icons.check, size: 11, color: Colors.white),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name,
                              style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded,
                              size: 16, color: Colors.blue),
                        ],
                        if (isAvailable) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Müsait',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.success)),
                          ),
                        ],
                      ],
                    ),

                    // Rating row
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        ...List.generate(
                          5,
                          (i) => Icon(
                            i < rating.floor()
                                ? Icons.star
                                : (i < rating ? Icons.star_half : Icons.star_border),
                            size: 13,
                            color: Colors.amber.shade600,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(rating.toStringAsFixed(1),
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary)),
                        Text(' ($reviews yorum)',
                            style: TextStyle(
                                fontSize: 11, color: AppColors.textHint)),
                      ],
                    ),

                    // Phase 261 — Güven Skoru (Wilson) mikro göstergesi
                    if (wilson > 0 && reviews > 0) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified_user_rounded,
                                size: 11, color: AppColors.primary),
                            const SizedBox(width: 3),
                            Text('Güven Skoru %${(wilson * 100).round()}',
                                style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary)),
                          ],
                        ),
                      ),
                    ],

                    // Bio
                    if (bio.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(bio,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              height: 1.4)),
                    ],

                    // Categories
                    if (cats.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: cats
                            .take(3)
                            .map((c) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(c.toString(),
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w500)),
                                ))
                            .toList(),
                      ),
                    ],

                    // Badges (Phase 54)
                    if (badges != null && badges.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      BadgeRow(badges: badges, compact: true),
                    ],

                    // Rate
                    if (rateMin != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.payments_outlined,
                              size: 13, color: AppColors.textHint),
                          const SizedBox(width: 4),
                          Text(
                            rateMax != null
                                ? '$rateMin–$rateMax ₺/sa'
                                : '$rateMin ₺/sa',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if ((user?['id']?.toString() ?? '').isNotEmpty)
                    FavoriteButton(workerId: user!['id'].toString())
                  else
                    const SizedBox(height: 34),
                  Icon(Icons.chevron_right,
                      color: AppColors.textHint, size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
