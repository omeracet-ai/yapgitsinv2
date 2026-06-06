import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/card_3d.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../../../map/presentation/screens/map_screen.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../categories/data/category_repository.dart';
import '../../../notifications/data/unread_count_provider.dart';
import '../../../notifications/presentation/screens/notification_screen.dart';
import '../../data/job_filter.dart';
import '../../widgets/job_filter_sheet.dart';
import '../providers/job_provider.dart';
import '../widgets/job_preview_sheet.dart';
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

  // Phase 346 — Multi-select kategori state'i.
  // `_selectedCategories` boş → "Tümü" (filtre yok, server-side category=NULL).
  // Doluysa client-side filter: jobs.where(c => selected.contains(category)).
  // Legacy `_activeCategory` shim kalır (eski helper'lar için), her zaman null.
  final Set<String> _selectedCategories = <String>{};
  String? get _activeCategory => null;
  String _searchQuery = '';
  Timer? _debounce;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _applyProximity();
    // Phase 312 — Sekme ilk kez açıldığında filtreyi tamamen temizle.
    // Provider modifikasyonu build sırasında yapılamaz → microtask.
    Future.microtask(_resetFilter);
  }

  /// Phase 312 — Filtreyi sıfırla:
  ///   • mesafe limiti `null` (badge çıkmaz, server radius filtresi pasif)
  ///   • bütçe alanları `null`, featured kapalı, sort = newest
  /// Backend yine de lat/lng varken sonuçları mesafeye göre + budget
  /// öncelikli + tarihe göre sıralar (Phase 312 backend ORDER BY).
  void _resetFilter() {
    if (!mounted) return;
    final current = ref.read(jobFilterProvider);
    if (current.isEmpty && current.maxRadiusKm == null) return;
    ref.read(jobFilterProvider.notifier).state = const JobFilter(
      maxRadiusKm: null,
    );
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

  /// Phase 346 — Eski tek-seçim helper. Set'e tek eleman yaz/temizle.
  // ignore: unused_element
  void _selectCategory(String? category) {
    setState(() {
      _selectedCategories.clear();
      if (category != null) _selectedCategories.add(category);
    });
    // Server fetch: kategori null → tüm liste; client-side filter setapply.
    ref.read(jobsProvider.notifier).fetchJobs(
          category: null,
          q: _searchQuery.isEmpty ? null : _searchQuery,
        );
  }

  /// Phase 346 — Multi-select category sheet.
  Future<void> _openCategoriesSheet(
      List<Map<String, dynamic>> cats) async {
    final allNames =
        cats.map((c) => (c['name'] as String?) ?? '').where((n) => n.isNotEmpty).toList();
    // Phase 398 — Slide-up sheet (380ms easeOutCubic), 3D Yapgitsin pattern,
    // live filter callback her toggle'da çağrılır.
    final result = await Navigator.of(context).push<Set<String>?>(
      PageRouteBuilder<Set<String>?>(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 380),
        reverseTransitionDuration: const Duration(milliseconds: 260),
        pageBuilder: (_, __, ___) => Align(
          alignment: Alignment.bottomCenter,
          child: FractionallySizedBox(
            heightFactor: 0.85,
            child: _CategoryMultiSelectSheet(
              all: allNames,
              initial: _selectedCategories,
              catIcons: {
                for (final c in cats)
                  (c['name'] as String?) ?? '':
                      (c['icon'] as String?) ?? '⭐',
              },
              onChange: (current) {
                // Phase 398 — anlık güncelleme: her toggle parent state'e yansır.
                if (!mounted) return;
                setState(() {
                  _selectedCategories
                    ..clear()
                    ..addAll(current);
                });
                ref.read(jobsProvider.notifier).fetchJobs(
                      category: null,
                      q: _searchQuery.isEmpty ? null : _searchQuery,
                    );
              },
            ),
          ),
        ),
        transitionsBuilder: (_, animation, __, child) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 1),
              end: Offset.zero,
            ).animate(CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
              reverseCurve: Curves.easeInCubic,
            )),
            child: child,
          );
        },
      ),
    );
    // Kapanışta son durum override (varsa); live onChange zaten uyguladı.
    if (result != null && mounted) {
      setState(() {
        _selectedCategories
          ..clear()
          ..addAll(result);
      });
    }
  }

  // Phase 297 — eski _onSearchChanged kaldırıldı; arama bottom-sheet
  // modal'ı (_openSearchSheet) anlık submit ile çağırılıyor.

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

    // Phase 312 — Yapgitsin sekmesinden çıkış (IndexedStack dispose
    // etmez). Tab index 1'den herhangi başka indekse geçince filtreyi
    // sıfırla → kullanıcı tab'a döndüğünde varsayılan "tüm liste".
    ref.listen<int>(selectedTabProvider, (prev, next) {
      if (prev == 1 && next != 1) _resetFilter();
    });

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
          // Phase 398 — Seçili kategori chip stripi (TopHeader hemen altında).
          // Yalnız boş değilse render edilir. Sağ kenarda "Kaldır" tüm seçimi siler.
          if (_selectedCategories.isNotEmpty)
            _buildSelectedChipsStrip(categoriesAsync),
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
                    // Phase 346 — client-side multi-category filter.
                    // Boş set = hepsi (filtre yok).
                    .where((j) =>
                        _selectedCategories.isEmpty ||
                        _selectedCategories.contains(j.category))
                    .toList();

                // Phase 312 — Sıralama tamamen backend'de:
                //   featured ASC → distance ASC (lat/lng varsa) →
                //   budget DESC → createdAt DESC.
                // Client-side re-sort backend'in mesafe sırasını bozardı;
                // kaldırıldı. Workererne uygun kategori önceliği gerekirse
                // ileride sunucu tarafına taşınmalı.
                final mySet = myCategories.toSet();
                if (mySet.isNotEmpty) {
                  // Stable: workererne ait kategoriler üste; aynı grup
                  // içinde backend sırası (indeks) korunur.
                  final indexed = filtered.asMap().entries.toList();
                  indexed.sort((a, b) {
                    final aMine = mySet.contains(a.value.category) ? 0 : 1;
                    final bMine = mySet.contains(b.value.category) ? 0 : 1;
                    if (aMine != bMine) return aMine - bMine;
                    return a.key.compareTo(b.key);
                  });
                  filtered = indexed.map((e) => e.value).toList();
                }

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

  /// Phase 297 — Kompakt header:
  ///   [🗺 Harita] [Kategori ▾]                  [🔍 Arama] [⚙ Filtre] [🔔]
  /// Kategori chip şeridi ve search bar kaldırıldı; tek dropdown +
  /// arama butonu (modal) ile yer kazanıldı.
  /// Phase 398 — Seçili kategorileri yatay chip stripi olarak gösterir.
  /// Her chip tıklanırsa o kategori silinir. Sağ kenarda "Kaldır" tüm seçimi
  /// temizler, anlık fetchJobs ile liste güncellenir.
  Widget _buildSelectedChipsStrip(
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
  ) {
    final cats = categoriesAsync.valueOrNull ?? const [];
    final icons = {
      for (final c in cats)
        (c['name'] as String?) ?? '': (c['icon'] as String?) ?? '⭐',
    };
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(10, 0, 4, 8),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final cat in _selectedCategories)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: InputChip(
                        label: Text('${icons[cat] ?? '⭐'}  $cat'),
                        labelStyle: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600),
                        backgroundColor:
                            AppColors.primary.withValues(alpha: 0.12),
                        side: BorderSide(
                            color:
                                AppColors.primary.withValues(alpha: 0.40),
                            width: 0.8),
                        labelPadding:
                            const EdgeInsets.symmetric(horizontal: 4),
                        deleteIcon: const Icon(Icons.close_rounded, size: 14),
                        deleteIconColor: AppColors.primary,
                        onDeleted: () {
                          setState(() => _selectedCategories.remove(cat));
                          ref.read(jobsProvider.notifier).fetchJobs(
                                category: null,
                                q: _searchQuery.isEmpty ? null : _searchQuery,
                              );
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () {
              setState(() => _selectedCategories.clear());
              ref.read(jobsProvider.notifier).fetchJobs(
                    category: null,
                    q: _searchQuery.isEmpty ? null : _searchQuery,
                  );
            },
            style: TextButton.styleFrom(
              foregroundColor: AppColors.error,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(0, 32),
            ),
            icon: const Icon(Icons.clear_all_rounded, size: 16),
            label: const Text('Kaldır',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter(
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
    int activeFilterCount,
    List<String> myCategories,
  ) {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(10, 6, 10, 6),
      child: Row(
        children: [
          // ── Sol: Harita ikonu (Yapgitsin içine taşındı, ana bottom-nav'da yok) ──
          _iconButton(
            icon: Icons.map_outlined,
            onTap: _openMapWithFilter,
            tooltip: 'Harita',
          ),
          const SizedBox(width: 6),
          // ── Orta: Kategori dropdown (tüm kategoriler + "Tümü") ──
          Expanded(child: _buildCategoryDropdown(categoriesAsync, myCategories)),
          const SizedBox(width: 6),
          // ── Sağ: Arama butonu + Filtre + Bildirim ──
          _iconButton(
            icon: _searchQuery.isEmpty ? Icons.search_rounded : Icons.search_off_rounded,
            onTap: _openSearchSheet,
            tooltip: 'Arama',
            highlight: _searchQuery.isNotEmpty,
          ),
          const SizedBox(width: 6),
          _filterButton(activeFilterCount),
          const SizedBox(width: 6),
          _notifButton(context),
        ],
      ),
    );
  }

  /// Phase 346 — Multi-select sheet trigger (eski dropdown yerine).
  /// Etiket: hepsi seçili veya boş → "Tümü"; tek seçim → kategori adı;
  /// 2+ → "X kategori".
  Widget _buildCategoryDropdown(
    AsyncValue<List<Map<String, dynamic>>> categoriesAsync,
    List<String> myCategories,
  ) {
    return categoriesAsync.when(
      data: (cats) {
        final selectedCount = _selectedCategories.length;
        final isAll = selectedCount == 0 || selectedCount == cats.length;
        String label;
        if (isAll) {
          label = 'Tümü';
        } else if (selectedCount == 1) {
          label = _selectedCategories.first;
        } else {
          label = '$selectedCount kategori';
        }
        return Material(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _openCategoriesSheet(cats),
            child: Container(
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Icon(Icons.checklist_rounded,
                      size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(label,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700)),
                  ),
                  if (!isAll)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('$selectedCount',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold)),
                    ),
                  Icon(Icons.keyboard_arrow_down_rounded,
                      size: 18, color: AppColors.textSecondary),
                ],
              ),
            ),
          ),
        );
      },
      loading: () => const SizedBox(height: 36),
      error: (_, __) => const SizedBox(height: 36),
    );
  }

  /// Phase 297 — Genel ikon-buton, header'da harita / arama için.
  Widget _iconButton({
    required IconData icon,
    required VoidCallback onTap,
    required String tooltip,
    bool highlight = false,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: highlight ? AppColors.primary : AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            child: Icon(
              icon,
              color: highlight ? Colors.white : AppColors.textPrimary,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }

  /// Phase 297 — Arama modal: bottom sheet içinde tek TextField + Ara/Temizle.
  Future<void> _openSearchSheet() async {
    final ctrl = TextEditingController(text: _searchQuery);
    final result = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Yapgitsin\'de Ara',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                style: TextStyle(color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Anahtar kelime',
                  prefixIcon:
                      const Icon(Icons.search_rounded, size: 20),
                  filled: true,
                  fillColor: AppColors.surfaceElevated,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: AppColors.border),
                  ),
                ),
                onSubmitted: (v) =>
                    Navigator.of(ctx).pop(v.trim()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(ctx).pop(''),
                      child: const Text('Temizle'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white),
                      onPressed: () =>
                          Navigator.of(ctx).pop(ctrl.text.trim()),
                      icon: const Icon(Icons.search_rounded, size: 18),
                      label: const Text('Ara'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (result == null) return;
    setState(() => _searchQuery = result);
    _searchController.text = result;
    ref.read(jobsProvider.notifier).setQuery(result);
  }

  /// Phase 297 — Harita ikonu tıklanınca filtreli haritayı aç.
  void _openMapWithFilter() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MapScreen()),
    );
  }

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
                // Phase 346 — multi-select reset.
                _selectedCategories.clear();
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
    // Phase 265e — backend liste yanıtı offerCount içeriyor (logout user
    // dahil herkes görür). jobOffersProvider per-card fetch kaldırıldı —
    // gereksiz network çağrısı + logout'ta 401 ile pasif rozet oluşturuyordu.
    final offerCount = job.offerCount;
    final isOwner = myUserId != null && job.customerId == myUserId;

    final budgetStr = (job.budgetMin != null && job.budgetMax != null)
        ? IntlFormatter.tlRange(job.budgetMin, job.budgetMax)
        : job.budgetMin != null
            ? '${IntlFormatter.tl(job.budgetMin!)} ~'
            : 'Belirtilmemiş';

    final postedAgo = job.createdAt != null
        ? _timeAgo(job.createdAt!)
        : '';

    // Phase 296 — Yeni kart yapısı (kullanıcı isteği):
    //   Sol kolon (Expanded):
    //     • Başlık (büyük)
    //     • 📍 Konum  •  ⏰ tarih/saat (esnek/acil/belirli ölçek)
    //     • "İlanı Aç" düğmesi
    //   Sağ kolon:
    //     • Bütçe pill (başlık hizasında)
    //     • Yuvarlak 3D poster avatar (foto yoksa ad ilk harfi)
    final scheduleLabel = _scheduleLabel(job);
    final posterName = job.poster?.fullName.trim() ?? '';
    final posterImg = job.poster?.profileImageUrl;
    final initials = posterName.isNotEmpty
        ? posterName.trim().split(RegExp(r'\s+')).first[0].toUpperCase()
        : '?';

    // Phase 436 — tap → bottom sheet preview; long-press → full detail.
    void openPreview() {
      JobPreviewSheet.show(context, job.id, jobObj: job);
    }

    void openJob() {
      Navigator.push(context, MaterialPageRoute(
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
      ));
    }

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: openPreview,
      onLongPress: openJob,
      child: Container(
        decoration: card3d(context, radius: 14, elevation: 1.1),
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── SOL: başlık + konum + zaman + "İlanı Aç" butonu ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    job.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(children: [
                    Icon(Icons.location_on_rounded,
                        size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        _shortLoc(job.location),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 3),
                  // Phase 298c — Schedule satırı temizlendi. offerCount /
                  // "Sizin" rozetleri sağ kolona taşındı, böylece kart kart
                  // tutarlı sağ-hizalama (avatar altında) sağlanır.
                  Row(children: [
                    Icon(scheduleLabel.icon,
                        size: 13, color: scheduleLabel.color),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        scheduleLabel.text,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 11,
                            color: scheduleLabel.color,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  // "İlanı Aç" butonu
                  SizedBox(
                    height: 28,
                    child: ElevatedButton.icon(
                      onPressed: openJob,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding:
                            const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                        textStyle: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                      label: const Text('İlanı Aç'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            // ── SAĞ: bütçe pill + 3D yuvarlak poster avatar ──
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary,
                        AppColors.primary.withValues(alpha: 0.78),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color:
                            AppColors.primary.withValues(alpha: 0.35),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Text(
                    budgetStr,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // 3D yuvarlak avatar — foto yoksa ad ilk harfi
                _Poster3DAvatar(imageUrl: posterImg, initials: initials),
                // Phase 298c — offerCount + "Sizin" rozetleri avatarın
                // altında, kart kart aynı sağ-hizalı pozisyon.
                if (offerCount > 0 || isOwner) ...[
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (offerCount > 0) ...[
                        const Icon(Icons.people_rounded,
                            size: 12, color: AppColors.primary),
                        const SizedBox(width: 2),
                        Text(
                          '$offerCount',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                      if (offerCount > 0 && isOwner)
                        const SizedBox(width: 6),
                      if (isOwner)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.primary
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Sizin',
                            style: TextStyle(
                              fontSize: 9,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Phase 298 — Konum metnini kısalt. Uzun reverse-geocode adresleri (örn.
  /// "141-141A, Chapel Street, Windsor, Melbourne, Victoria, 3181, Avustralya")
  /// kartın sağ kolon hizasını bozuyordu. Strateji:
  ///  • Virgülle parçala, boş ve sadece-rakam segmentleri at (posta kodu vb.).
  ///  • Son 2 anlamlı segmenti döndür ("Şehir, Ülke" / "İlçe, Şehir" tarzı).
  ///  • 2 segmentten az kalırsa elde olanı kullan, max 28 karaktere kırp.
  String _shortLoc(String raw) {
    final parts = raw
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return raw.trim();
    final meaningful =
        parts.where((p) => !RegExp(r'^\d+$').hasMatch(p)).toList();
    final source = meaningful.isEmpty ? parts : meaningful;
    final tail = source.length <= 2
        ? source
        : source.sublist(source.length - 2);
    final joined = tail.join(', ');
    return joined.length <= 28 ? joined : '${joined.substring(0, 27)}…';
  }

  _ScheduleVisual _scheduleLabel(Job j) {
    // Phase 296 — schedule flexibility + dueDate/dueTime'a göre etiket üret.
    final flex = j.scheduleFlexibility;
    if (flex == 'urgent') {
      return const _ScheduleVisual(
        icon: Icons.bolt_rounded,
        text: 'Acil — bugün',
        color: AppColors.error,
      );
    }
    if (flex == 'specific' && j.dueDate != null) {
      final d = j.dueDate!;
      final parts = d.split('-');
      final fmt = parts.length == 3
          ? '${parts[2]}.${parts[1]}.${parts[0]}'
          : d;
      final timeStr = (j.dueAnyTime || j.dueTime == null) ? '' : ' • ${j.dueTime}';
      return _ScheduleVisual(
        icon: Icons.event_rounded,
        text: '$fmt$timeStr',
        color: AppColors.primary,
      );
    }
    // flexible / default
    return _ScheduleVisual(
      icon: Icons.event_available_rounded,
      text: 'Esnek tarih',
      color: AppColors.textSecondary,
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

/// Phase 296 — Schedule görsel etiketi.
class _ScheduleVisual {
  final IconData icon;
  final String text;
  final Color color;
  const _ScheduleVisual({
    required this.icon,
    required this.text,
    required this.color,
  });
}

/// Phase 296 — Yuvarlak 3D ilan sahibi avatarı.
///
/// `imageUrl` doluysa CircleAvatar, boşsa `initials` (ad ilk harfi) gösterir.
/// Çift katmanlı highlight + drop shadow ile 3D ışıma efekti verir.
class _Poster3DAvatar extends StatelessWidget {
  final String? imageUrl;
  final String initials;
  const _Poster3DAvatar({required this.imageUrl, required this.initials});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.95),
            AppColors.primary.withValues(alpha: 0.55),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.45),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.18),
            blurRadius: 4,
            offset: const Offset(-1, -2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(2.2),
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.surface,
        ),
        clipBehavior: Clip.antiAlias,
        child: imageUrl != null && imageUrl!.isNotEmpty
            ? Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _initialsFallback(),
              )
            : _initialsFallback(),
      ),
    );
  }

  Widget _initialsFallback() {
    return Center(
      child: Text(
        initials,
        style: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
    );
  }
}

/// Phase 346 — Multi-select kategori sheet'i (Yapgitsin tab dropdown
/// yerine). Ekranın ~%85'ini kaplar, master "Tümü" + her kategori
/// için checkbox + emoji ikon.
class _CategoryMultiSelectSheet extends StatefulWidget {
  final List<String> all;
  final Set<String> initial;
  final Map<String, String> catIcons;
  /// Phase 398 — anlık filtreleme. Her toggle'da çağrılır, parent state
  /// senkron tutulur. null geçilirse opt-out (eski behavior).
  final void Function(Set<String> current)? onChange;
  const _CategoryMultiSelectSheet({
    required this.all,
    required this.initial,
    required this.catIcons,
    this.onChange,
  });

  @override
  State<_CategoryMultiSelectSheet> createState() =>
      _CategoryMultiSelectSheetState();
}

class _CategoryMultiSelectSheetState
    extends State<_CategoryMultiSelectSheet> {
  // Phase 398 BUG FIX — initial seti boş gelirse checkbox'lar BOŞ başlasın.
  // Eski Phase 378 davranışı: empty → all ticked (yanıltıcıydı).
  // Yeni: empty → empty. Kullanıcı seçim yaparak filtreler.
  late final Set<String> _temp = {...widget.initial};

  void _notify() {
    widget.onChange?.call(_temp);
  }

  void _toggle(String cat, bool? v) {
    setState(() {
      if (v == true) {
        _temp.add(cat);
      } else {
        _temp.remove(cat);
      }
    });
    _notify();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    // Phase 398 — Yapgitsin 3D pattern (workers_nearby_sheet ile aynı):
    // koyu dikey gradient, üst beyaz highlight, "kalkık" boxShadow, 22px corner.
    const bgTop = Color(0xFF1A1F2E);
    const bgBot = Color(0xFF0C1117);
    final highlight = Colors.white.withValues(alpha: 0.08);
    return Material(
      type: MaterialType.transparency,
      child: Padding(
        padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [bgTop, bgBot],
            ),
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(22)),
            border: Border(top: BorderSide(color: highlight, width: 1)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.50),
                blurRadius: 28,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: SafeArea(
          top: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              // Phase 398 — drag handle 44×4, beyaz alpha 0.18 (Yapgitsin std).
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Phase 398 — "Kategoriler / Hepsi" header ve "Tümü" master checkbox
              // KALDIRILDI (kullanıcı isteği). Liste direkt kategori checkbox'larıyla
              // başlar. Filtre boş = tüm ilanlar (semantik korunur).
              const SizedBox(height: 8),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  children: [
                    ...widget.all.map((cat) {
                      // Phase 398 — checkbox boş başlar, dark sheet için beyaz text.
                      final selected = _temp.contains(cat);
                      final icon = widget.catIcons[cat] ?? '⭐';
                      return CheckboxListTile(
                        value: selected,
                        onChanged: (v) => _toggle(cat, v),
                        activeColor: AppColors.primary,
                        checkColor: Colors.white,
                        side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.35),
                            width: 1.4),
                        title: Text('$icon  $cat',
                            style: TextStyle(
                              fontWeight: selected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              color: Colors.white.withValues(
                                  alpha: selected ? 1.0 : 0.85),
                            )),
                        controlAffinity: ListTileControlAffinity.trailing,
                      );
                    }),
                  ],
                ),
              ),
              // Phase 398 — Tek "Kapat" butonu (live filter zaten anlık uyguladı).
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        Navigator.of(context).pop(_temp),
                    icon: const Icon(Icons.check_rounded, size: 18),
                    label: Text(_temp.isEmpty
                        ? 'Tümü'
                        : '${_temp.length} seçim aktif'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }
}
