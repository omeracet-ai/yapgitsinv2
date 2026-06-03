import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
// Phase 344 — Yapgitsin tab'ındaki 3D efekti tüm tab içeriklerine uygula.
import '../../../../core/theme/card_3d.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/job_repository.dart';
import '../../data/offer_repository.dart';
import '../../../tokens/data/token_repository.dart';
import 'job_opportunities_screen.dart';
import 'post_job_screen.dart';
import '../../../../l10n/app_localizations.dart';
import '../widgets/boost_dialog.dart';
import '../widgets/job_history_dialog.dart';
import '../widgets/pending_confirmations_card.dart';
// Phase 325 — Takvim sekmesi için booking provider + detail route.
import '../../../calendar/data/booking_repository.dart';
import '../../../calendar/presentation/booking_detail_screen.dart';
import '../../../../core/models/booking_model.dart';

// ─── Providers ────────────────────────────────────────────────────────────────

final myJobsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, customerId) {
  return ref.watch(jobRepositoryProvider).getMyJobs(customerId);
});

final myOffersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(offerRepositoryProvider).getMyOffers();
});

// ─── Screen ───────────────────────────────────────────────────────────────────

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class MyJobsBody extends MyJobsScreen {
  const MyJobsBody({super.key}) : super(showAppBar: false);
}

class MyJobsScreen extends ConsumerWidget {
  final bool showAppBar;
  const MyJobsScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    // Phase 306 — Logged-out kullanıcı için Profil ekranındaki guest pattern.
    // Önceki davranış: sonsuz CircularProgressIndicator (#bug).
    if (authState is AuthLoading || authState is AuthInitial) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (authState is! AuthAuthenticated) {
      return _MyJobsGuestView(showAppBar: showAppBar);
    }

    final user = authState.user;
    final userId = user['id'] as String;
    final asWorkerTotal = (user['asWorkerTotal'] as num?)?.toInt() ?? 0;

    if (asWorkerTotal > 0) {
      return _DualRoleView(userId: userId, showAppBar: showAppBar);
    }
    return _DualRoleCheckView(userId: userId, showAppBar: showAppBar);
  }
}

// Phase 306 — Logout sonrası İşlerim sekmesi için boş + CTA görünümü.
class _MyJobsGuestView extends StatelessWidget {
  final bool showAppBar;
  const _MyJobsGuestView({required this.showAppBar});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: showAppBar
          ? AppBar(
              title: Text(AppLocalizations.of(context).myJobsListings),
              backgroundColor: AppColors.headerBackground(context),
              foregroundColor: Colors.white,
            )
          : null,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset('assets/icons/app_icon.png',
                    width: 80, height: 80, fit: BoxFit.cover),
              ),
              const SizedBox(height: 24),
              Text('İlanlarınızı ve tekliflerinizi görmek için giriş yapın.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 16, color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/giris-yap'),
                  child: Text(AppLocalizations.of(context).loginButton),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Checks if user has any offers, then decides single vs dual view
class _DualRoleCheckView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _DualRoleCheckView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offersAsync = ref.watch(myOffersProvider);

    return offersAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => _CustomerJobsView(userId: userId, showAppBar: showAppBar),
      data: (offers) {
        if (offers.isNotEmpty) {
          return _DualRoleView(userId: userId, showAppBar: showAppBar);
        }
        return _CustomerJobsView(userId: userId, showAppBar: showAppBar);
      },
    );
  }
}

// ─── Dual Role View (Customer + Worker tabs) ──────────────────────────────────

class _DualRoleView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _DualRoleView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Phase 338 — Tab yapısı kaldırıldı; tek sayfada filter chip'leri var.
    // Tümü = 3 kategoriyi (Aktif İlanlarım + Tekliflerim + Biten İşler)
    // tek scroll'da bölüm başlıklarıyla gösterir. Takvim 5. chip olarak
    // korundu (Phase 325 fonksiyonelliği bozulmasın).
    // Phase 340 — AppBar tamamen kaldırıldı. "İşlerim" başlığı silindi,
    // filter row (Tümü ▼ + search + bildirim) en üste, status bar
    // altına SafeArea ile bağlandı.
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: const [
            PendingConfirmationsCard(),
            Expanded(child: _MergedJobsView()),
          ],
        ),
      ),
    );
  }
}

// ─── Phase 338 — Single-page merged view with filter chips ───────────────────

// Phase 346 — Multi-select için `all` meta-değer kaldırıldı. UI'da
// 4 kategorinin hepsi seçili olduğunda "Tümü" yazısı görünür.
enum _JobsFilter { active, offers, completed, calendar }

// Phase 342 — Filtreleme sheet'i için sıralama + tarih aralığı.
enum _MyJobsSort { newest, oldest, budgetHigh, budgetLow }

extension _MyJobsSortMeta on _MyJobsSort {
  String get label => switch (this) {
        _MyJobsSort.newest => 'En Yeni',
        _MyJobsSort.oldest => 'En Eski',
        _MyJobsSort.budgetHigh => 'Bütçe (Yüksek → Düşük)',
        _MyJobsSort.budgetLow => 'Bütçe (Düşük → Yüksek)',
      };
  IconData get icon => switch (this) {
        _MyJobsSort.newest => Icons.arrow_downward,
        _MyJobsSort.oldest => Icons.arrow_upward,
        _MyJobsSort.budgetHigh => Icons.trending_down,
        _MyJobsSort.budgetLow => Icons.trending_up,
      };
}

enum _MyJobsRange { all, last7, last30 }

extension _MyJobsRangeMeta on _MyJobsRange {
  String get label => switch (this) {
        _MyJobsRange.all => 'Tüm zamanlar',
        _MyJobsRange.last7 => 'Son 7 gün',
        _MyJobsRange.last30 => 'Son 30 gün',
      };
  int? get cutoffDays => switch (this) {
        _MyJobsRange.all => null,
        _MyJobsRange.last7 => 7,
        _MyJobsRange.last30 => 30,
      };
}

extension _JobsFilterMeta on _JobsFilter {
  String get label => switch (this) {
        _JobsFilter.active => 'Aktif İlanlarım',
        _JobsFilter.offers => 'Tekliflerim',
        _JobsFilter.completed => 'Biten İşler',
        _JobsFilter.calendar => 'Takvim',
      };
  IconData get icon => switch (this) {
        _JobsFilter.active => Icons.assignment_outlined,
        _JobsFilter.offers => Icons.handyman_outlined,
        _JobsFilter.completed => Icons.check_circle_outline,
        _JobsFilter.calendar => Icons.calendar_month_outlined,
      };
}

class _MergedJobsView extends ConsumerStatefulWidget {
  const _MergedJobsView();

  @override
  ConsumerState<_MergedJobsView> createState() => _MergedJobsViewState();
}

class _MergedJobsViewState extends ConsumerState<_MergedJobsView> {
  // Phase 347 — Multi-select default BOŞ. Boş set = "Tümü" semantic
  // (filtre yok, hepsi gösterilir). Kullanıcı checkbox doldurdukça
  // seçim başlar; tüm 4 kategori seçilince tekrar boş set'e döner.
  final Set<_JobsFilter> _selected = <_JobsFilter>{};

  bool get _isAllSelected => _selected.isEmpty;

  String get _selectionLabel {
    if (_isAllSelected) return 'Tümü';
    if (_selected.length == 1) return _selected.first.label;
    return '${_selected.length} seçili';
  }

  // Phase 340 — başlık/şablon ikonu kaldırıldı; search aktif.
  String _searchQuery = '';
  // Phase 342 — Filtreleme: sıralama + tarih aralığı.
  _MyJobsSort _sort = _MyJobsSort.newest;
  _MyJobsRange _range = _MyJobsRange.all;

  Future<void> _openSelectionSheet() async {
    // Phase 398 — Slide-up route (380ms easeOutCubic), live filter callback.
    final result = await Navigator.of(context).push<Set<_JobsFilter>?>(
      PageRouteBuilder<Set<_JobsFilter>?>(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 380),
        reverseTransitionDuration: const Duration(milliseconds: 260),
        pageBuilder: (_, __, ___) => Align(
          alignment: Alignment.bottomCenter,
          child: FractionallySizedBox(
            heightFactor: 0.85,
            child: _JobsMultiSelectSheet(
              initial: _selected,
              onChange: (current) {
                if (!mounted) return;
                setState(() {
                  _selected
                    ..clear()
                    ..addAll(current);
                });
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
    if (result != null && mounted) {
      setState(() {
        _selected
          ..clear()
          ..addAll(result);
      });
    }
  }

  int get _activeFilterCount {
    var c = 0;
    if (_sort != _MyJobsSort.newest) c++;
    if (_range != _MyJobsRange.all) c++;
    return c;
  }

  Future<void> _openFilterSheet() async {
    final result = await showModalBottomSheet<({_MyJobsSort sort, _MyJobsRange range})?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MyJobsFilterSheet(
        initialSort: _sort,
        initialRange: _range,
      ),
    );
    if (result != null && mounted) {
      setState(() {
        _sort = result.sort;
        _range = result.range;
      });
    }
  }

  Future<void> _openSearchSheet() async {
    final controller = TextEditingController(text: _searchQuery);
    final result = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16, right: 16, top: 16),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text('İşlerim İçinde Ara',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                textInputAction: TextInputAction.search,
                onSubmitted: (v) => Navigator.of(ctx).pop(v.trim()),
                decoration: InputDecoration(
                  hintText: 'Başlık ara...',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(''),
                    child: const Text('Temizle'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () =>
                        Navigator.of(ctx).pop(controller.text.trim()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Ara'),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() => _searchQuery = result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Phase 340 — Top header: [Tümü ▼] [search] [bildirim].
        Container(
          color: AppColors.background,
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 6),
          child: Row(
            children: [
              Expanded(child: _buildFilterDropdown()),
              const SizedBox(width: 6),
              _headerIconButton(
                icon: _searchQuery.isEmpty
                    ? Icons.search_rounded
                    : Icons.search_off_rounded,
                tooltip:
                    _searchQuery.isEmpty ? 'Arama' : 'Aramayı kapat',
                highlight: _searchQuery.isNotEmpty,
                onTap: () {
                  if (_searchQuery.isNotEmpty) {
                    setState(() => _searchQuery = '');
                  } else {
                    _openSearchSheet();
                  }
                },
              ),
              const SizedBox(width: 6),
              // Phase 342 — Filtreleme butonu (sort + tarih aralığı).
              _filterButtonWithBadge(),
              const SizedBox(width: 6),
              _headerIconButton(
                icon: Icons.notifications_outlined,
                tooltip: 'Bildirimler',
                onTap: () => context.push('/bildirimler'),
              ),
            ],
          ),
        ),
        // Phase 398 — TopHeader altında seçili kategori chip stripi + Kaldır.
        // Yalnız _selected dolu ise render.
        if (_selected.isNotEmpty) _buildSelectedChipsStrip(),
        if (_searchQuery.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
            child: Row(children: [
              Icon(Icons.filter_alt_outlined,
                  size: 14, color: AppColors.primary),
              const SizedBox(width: 4),
              Expanded(
                child: Text('"$_searchQuery" için filtrelendi',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ),
            ]),
          ),
        Expanded(child: _buildContent()),
      ],
    );
  }

  /// Phase 346 — Dropdown yerine sheet-trigger button. Etiket aktif
  /// seçime göre değişir: "Tümü" / "X seçili" / tek isim.
  /// Phase 398 — Seçili filtreleri yatay chip stripi. Sağ kenarda Kaldır.
  Widget _buildSelectedChipsStrip() {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(10, 0, 4, 6),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final f in _selected)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: InputChip(
                        avatar: Icon(f.icon,
                            size: 14, color: AppColors.primary),
                        label: Text(f.label),
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
                          setState(() => _selected.remove(f));
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () => setState(() => _selected.clear()),
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

  Widget _buildFilterDropdown() {
    return Material(
      color: AppColors.surfaceElevated,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: _openSelectionSheet,
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
                child: Text(
                  _selectionLabel,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 12.5,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700),
                ),
              ),
              if (!_isAllSelected && _selected.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('${_selected.length}',
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
  }

  Widget _filterButtonWithBadge() {
    final count = _activeFilterCount;
    final highlight = count > 0;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        _headerIconButton(
          icon: Icons.tune_rounded,
          tooltip: 'Filtreleme',
          highlight: highlight,
          onTap: _openFilterSheet,
        ),
        if (highlight)
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
                border:
                    Border.all(color: AppColors.background, width: 1.5),
              ),
              child: Text('$count',
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

  Widget _headerIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
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
            child: Icon(icon,
                color: highlight ? Colors.white : AppColors.textPrimary,
                size: 22),
          ),
        ),
      ),
    );
  }

  /// Phase 347 — Multi-select set'ine göre içerik:
  /// * Set boş → "Tümü" semantic (4 kaynak da dahil, merged list).
  /// * Set tek bir kategori → eski tek-tab davranışı.
  /// * Set ≥ 2 → `_AllItemsMergedList` set parametresiyle filtreli merge.
  Widget _buildContent() {
    final q = _searchQuery;
    if (_selected.isEmpty) {
      // Tümü → tüm kaynaklar dahil.
      return _AllItemsMergedList(
        searchQuery: q,
        sort: _sort,
        range: _range,
      );
    }
    if (_selected.length == 1) {
      switch (_selected.first) {
        case _JobsFilter.active:
          return _CustomerJobsByStatus(
            statuses: const ['open', 'in_progress'],
            emptyMsg: 'Aktif ilanınız yok.',
            searchQuery: q,
          );
        case _JobsFilter.offers:
          return const _WorkerTabContent();
        case _JobsFilter.completed:
          return _CustomerJobsByStatus(
            statuses: const ['completed'],
            emptyMsg: 'Tamamlanan işiniz yok.',
            searchQuery: q,
          );
        case _JobsFilter.calendar:
          return const _BookingsCalendarTab();
      }
    }
    // 2+ seçim: merged list. Set hangileri seçili olduğunu söyler.
    return _AllItemsMergedList(
      searchQuery: q,
      sort: _sort,
      range: _range,
      includeJobsActive: _selected.contains(_JobsFilter.active),
      includeOffers: _selected.contains(_JobsFilter.offers),
      includeJobsCompleted: _selected.contains(_JobsFilter.completed),
      includeBookings: _selected.contains(_JobsFilter.calendar),
    );
  }
}

/// Phase 341 — Tümü için single merge'lı liste. Jobs + Offers tek
/// `_MergedItem` listesine map'lenir, createdAt DESC sıralanır, tek
/// `ListView.builder` ile basılır. Section başlığı yok.
class _AllItemsMergedList extends ConsumerWidget {
  final String searchQuery;
  final _MyJobsSort sort;
  final _MyJobsRange range;
  // Phase 346 — multi-select flag'leri (hangi kaynaklar dahil).
  final bool includeJobsActive;
  final bool includeJobsCompleted;
  final bool includeOffers;
  final bool includeBookings;
  const _AllItemsMergedList({
    required this.searchQuery,
    this.sort = _MyJobsSort.newest,
    this.range = _MyJobsRange.all,
    this.includeJobsActive = true,
    this.includeJobsCompleted = true,
    this.includeOffers = true,
    this.includeBookings = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();
    final userId = authState.user['id'] as String;
    final jobsAsync = ref.watch(myJobsProvider(userId));
    final offersAsync = ref.watch(myOffersProvider);
    // Phase 346 — Takvim (bookings) opsiyonel kaynak.
    final bookingsAsync = includeBookings
        ? ref.watch(myCustomerBookingsProvider)
        : null;

    if (jobsAsync.isLoading ||
        offersAsync.isLoading ||
        (bookingsAsync?.isLoading ?? false)) {
      return ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      );
    }
    final jobs = jobsAsync.valueOrNull ?? const [];
    final offers = offersAsync.valueOrNull ?? const [];
    final bookings = bookingsAsync?.valueOrNull ?? const [];
    final q = searchQuery.toLowerCase();

    final items = <_MergedItem>[];
    final cutoff = range.cutoffDays == null
        ? null
        : DateTime.now().subtract(Duration(days: range.cutoffDays!));

    bool inDateRange(String? createdAt) {
      if (cutoff == null) return true;
      if (createdAt == null) return false;
      final dt = DateTime.tryParse(createdAt);
      return dt != null && dt.isAfter(cutoff);
    }

    double itemBudget(_MergedItem it) {
      if (it.type == _MergedKind.job) {
        final v = (it.data['budgetMax'] as num?) ??
            (it.data['budgetMin'] as num?);
        return v?.toDouble() ?? 0;
      }
      // Offer: price (float) ya da priceMinor (kuruş int).
      final price = (it.data['price'] as num?)?.toDouble();
      if (price != null) return price;
      final minor = (it.data['priceMinor'] as num?)?.toInt();
      return minor != null ? minor / 100.0 : 0;
    }

    for (final j in jobs) {
      final status = j['status']?.toString();
      final isActive = status == 'open' || status == 'in_progress';
      final isCompleted = status == 'completed';
      // Phase 346 — Aktif/Biten flag'lerine göre dahil et.
      if (isActive && !includeJobsActive) continue;
      if (isCompleted && !includeJobsCompleted) continue;
      if (!isActive && !isCompleted) continue;
      final title = j['title']?.toString() ?? '';
      if (q.isNotEmpty && !title.toLowerCase().contains(q)) continue;
      final createdAt = j['createdAt']?.toString();
      if (!inDateRange(createdAt)) continue;
      items.add(_MergedItem(
        type: _MergedKind.job,
        data: j,
        sortKey: createdAt ?? '',
      ));
    }
    if (includeOffers) {
      for (final o in offers) {
        final job = o['job'];
        final title =
            (job is Map ? job['title']?.toString() : null) ?? '';
        if (q.isNotEmpty && !title.toLowerCase().contains(q)) continue;
        final createdAt = o['createdAt']?.toString();
        if (!inDateRange(createdAt)) continue;
        items.add(_MergedItem(
          type: _MergedKind.offer,
          data: o,
          sortKey: createdAt ?? '',
        ));
      }
    }
    if (includeBookings) {
      for (final b in bookings) {
        // Search: kategori veya açıklama.
        final cat = b.category;
        final desc = b.description;
        if (q.isNotEmpty &&
            !cat.toLowerCase().contains(q) &&
            !desc.toLowerCase().contains(q)) continue;
        final sortKey = b.scheduledDate.toIso8601String();
        items.add(_MergedItem(
          type: _MergedKind.booking,
          data: {'__booking': b},
          sortKey: sortKey,
        ));
      }
    }

    switch (sort) {
      case _MyJobsSort.newest:
        items.sort((a, b) => b.sortKey.compareTo(a.sortKey));
        break;
      case _MyJobsSort.oldest:
        items.sort((a, b) => a.sortKey.compareTo(b.sortKey));
        break;
      case _MyJobsSort.budgetHigh:
        items.sort((a, b) => itemBudget(b).compareTo(itemBudget(a)));
        break;
      case _MyJobsSort.budgetLow:
        items.sort((a, b) => itemBudget(a).compareTo(itemBudget(b)));
        break;
    }

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            q.isEmpty
                ? 'Henüz aktivite yok.'
                : 'Aramayla eşleşen kayıt yok.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13, color: AppColors.textSecondary),
          ),
        ),
      );
    }

    // Phase 345 — Yapgitsin tab pattern'i: `ListView.separated` ile
    // kartlar arası 6px boşluk → üst üste binme yok.
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        final it = items[i];
        switch (it.type) {
          case _MergedKind.job:
            return _CustomerJobCard(job: it.data);
          case _MergedKind.offer:
            return _WorkerOfferCard(offer: it.data);
          case _MergedKind.booking:
            final b = it.data['__booking'] as Booking;
            return _CompactBookingRow(booking: b);
        }
      },
    );
  }
}

/// Phase 342 — Filtreleme modal bottom-sheet'i. Sort + tarih aralığı,
/// `_MergedJobsViewState` üzerinden uygulanır.
class _MyJobsFilterSheet extends StatefulWidget {
  final _MyJobsSort initialSort;
  final _MyJobsRange initialRange;
  const _MyJobsFilterSheet({
    required this.initialSort,
    required this.initialRange,
  });

  @override
  State<_MyJobsFilterSheet> createState() => _MyJobsFilterSheetState();
}

class _MyJobsFilterSheetState extends State<_MyJobsFilterSheet> {
  late _MyJobsSort _sort = widget.initialSort;
  late _MyJobsRange _range = widget.initialRange;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16, right: 16, top: 16),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(children: [
              const Text('Filtreleme',
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold)),
              const Spacer(),
              if (_sort != _MyJobsSort.newest ||
                  _range != _MyJobsRange.all)
                TextButton(
                  onPressed: () => setState(() {
                    _sort = _MyJobsSort.newest;
                    _range = _MyJobsRange.all;
                  }),
                  child: const Text('Sıfırla'),
                ),
            ]),
            const SizedBox(height: 8),
            Text('Sıralama',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _MyJobsSort.values
                  .map((s) => ChoiceChip(
                        label: Text(s.label,
                            style: const TextStyle(fontSize: 12)),
                        avatar:
                            Icon(s.icon, size: 14, color: _sort == s ? Colors.white : AppColors.textSecondary),
                        selected: _sort == s,
                        showCheckmark: false,
                        onSelected: (_) => setState(() => _sort = s),
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.background,
                        labelStyle: TextStyle(
                          color: _sort == s
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: _sort == s
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 14),
            Text('Tarih Aralığı',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _MyJobsRange.values
                  .map((r) => ChoiceChip(
                        label: Text(r.label,
                            style: const TextStyle(fontSize: 12)),
                        selected: _range == r,
                        showCheckmark: false,
                        onSelected: (_) => setState(() => _range = r),
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.background,
                        labelStyle: TextStyle(
                          color: _range == r
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: _range == r
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.of(context)
                    .pop((sort: _sort, range: _range)),
                icon: const Icon(Icons.check_rounded, size: 18),
                label: const Text('Uygula'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Phase 346 — Multi-select kategori sheet'i. Ekranın ~%85'ini kaplar,
/// "Tümü" master checkbox + her kategoriye ayrı checkbox. "Uygula"
/// butonu Set döner; "Sıfırla" hepsini seçili yapar.
class _JobsMultiSelectSheet extends StatefulWidget {
  final Set<_JobsFilter> initial;
  final void Function(Set<_JobsFilter> current)? onChange;
  const _JobsMultiSelectSheet({required this.initial, this.onChange});

  @override
  State<_JobsMultiSelectSheet> createState() =>
      _JobsMultiSelectSheetState();
}

class _JobsMultiSelectSheetState extends State<_JobsMultiSelectSheet> {
  // Phase 398 — Boş başla (eski Phase 378 yanıltıcı "empty=all-ticked"
  // davranışı kaldırıldı). Kullanıcı seçim yaparak filtreler.
  late final Set<_JobsFilter> _temp = {...widget.initial};

  void _notify() => widget.onChange?.call(_temp);

  void _toggle(_JobsFilter f, bool? v) {
    setState(() {
      if (v == true) {
        _temp.add(f);
      } else {
        _temp.remove(f);
      }
    });
    _notify();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    // Phase 398 — Yapgitsin 3D pattern: koyu dikey gradient + drag handle
    // + üst highlight + yukarı yönelik boxShadow + 22px corner.
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
                // Phase 398 — "Kategoriler / Hepsi" header + Tümü master KALDIRILDI.
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    children: [
                      ..._JobsFilter.values.map((f) {
                        final selected = _temp.contains(f);
                        return CheckboxListTile(
                          value: selected,
                          onChanged: (v) => _toggle(f, v),
                          activeColor: AppColors.primary,
                          checkColor: Colors.white,
                          side: BorderSide(
                              color: Colors.white.withValues(alpha: 0.35),
                              width: 1.4),
                          title: Text(f.label,
                              style: TextStyle(
                                fontWeight: selected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: Colors.white.withValues(
                                    alpha: selected ? 1.0 : 0.85),
                              )),
                          secondary: Icon(f.icon,
                              color: selected
                                  ? AppColors.primary
                                  : Colors.white.withValues(alpha: 0.55)),
                          controlAffinity:
                              ListTileControlAffinity.trailing,
                        );
                      }),
                    ],
                  ),
                ),
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
                        padding:
                            const EdgeInsets.symmetric(vertical: 14),
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

enum _MergedKind { job, offer, booking }

class _MergedItem {
  final _MergedKind type;
  final Map<String, dynamic> data;
  final String sortKey;
  _MergedItem({
    required this.type,
    required this.data,
    required this.sortKey,
  });
}

// ignore: unused_element
class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 16,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

/// Embedded variant — shrinkWrap + NeverScrollable; parent ListView scroll'ar.
// Phase 341 — Section-tabanlı `_CustomerJobsByStatusEmbedded` ve
// `_WorkerOffersEmbedded` widget'ları kaldırıldı. Tümü görünümü
// `_AllItemsMergedList` ile yeniden yazıldı (jobs + offers chronological
// merge, başlıksız tek liste).

// ─── Phase 302 — Customer jobs filtered by status (no inner tabs) ────────────
//
// Yeni İşlerim sekmesinde Aktif İlanlarım / Biten İşler tabları için
// statü-bazlı düz liste. İçeride alt-tab yok — tek scroll.
class _CustomerJobsByStatus extends ConsumerWidget {
  final List<String> statuses;
  final String emptyMsg;
  // Phase 340 — boş ise filtre yok.
  final String searchQuery;
  const _CustomerJobsByStatus({
    required this.statuses,
    required this.emptyMsg,
    this.searchQuery = '',
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();
    final userId = authState.user['id'] as String;
    final jobsAsync = ref.watch(myJobsProvider(userId));
    return jobsAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (allJobs) {
        final q = searchQuery.toLowerCase();
        final filtered = allJobs
            .where((j) => statuses.contains(j['status'] as String?))
            .where((j) => q.isEmpty ||
                (j['title']?.toString().toLowerCase().contains(q) ?? false))
            .toList();
        return _JobList(jobs: filtered, emptyMsg: emptyMsg);
      },
    );
  }
}

// ─── Worker tab content ───────────────────────────────────────────────────────

// Phase 303 — Tekliflerim alt sekmeleri tek dropdown filtre butonuna indirildi.
// Sıra: Tümü → Bekleyen → Kabul Edilen → Reddedilen.
enum _OfferFilter { all, pending, accepted, rejected }

extension _OfferFilterLabel on _OfferFilter {
  String get label => switch (this) {
        _OfferFilter.all => 'Tümü',
        _OfferFilter.pending => 'Bekleyen',
        _OfferFilter.accepted => 'Kabul Edilen',
        _OfferFilter.rejected => 'Reddedilen',
      };

  IconData get icon => switch (this) {
        _OfferFilter.all => Icons.list_alt_outlined,
        _OfferFilter.pending => Icons.schedule_outlined,
        _OfferFilter.accepted => Icons.check_circle_outline,
        _OfferFilter.rejected => Icons.cancel_outlined,
      };
}

// Phase 304 — Tekliflerim arama + filtre. Sıralama opsiyonları.
enum _OfferSort { newest, oldest, priceHigh, priceLow }

extension _OfferSortLabel on _OfferSort {
  String get label => switch (this) {
        _OfferSort.newest => 'En Yeni',
        _OfferSort.oldest => 'En Eski',
        _OfferSort.priceHigh => 'Fiyat (Yüksek → Düşük)',
        _OfferSort.priceLow => 'Fiyat (Düşük → Yüksek)',
      };

  IconData get icon => switch (this) {
        _OfferSort.newest => Icons.arrow_downward,
        _OfferSort.oldest => Icons.arrow_upward,
        _OfferSort.priceHigh => Icons.trending_down,
        _OfferSort.priceLow => Icons.trending_up,
      };
}

class _WorkerTabContent extends ConsumerStatefulWidget {
  const _WorkerTabContent();

  @override
  ConsumerState<_WorkerTabContent> createState() => _WorkerTabContentState();
}

class _WorkerTabContentState extends ConsumerState<_WorkerTabContent> {
  _OfferFilter _filter = _OfferFilter.all;
  _OfferSort _sort = _OfferSort.newest;
  bool _searchOpen = false;
  String _search = '';
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  double _priceOf(Map<String, dynamic> o) {
    final priceMinor = (o['priceMinor'] as num?)?.toInt();
    return (o['price'] as num?)?.toDouble() ??
        (priceMinor != null ? priceMinor / 100 : 0.0);
  }

  List<Map<String, dynamic>> _apply(List<Map<String, dynamic>> offers) {
    Iterable<Map<String, dynamic>> list = offers;
    // Status filtresi
    list = switch (_filter) {
      _OfferFilter.all => list,
      // Phase 262 — countered (karşı teklif bekleyen) da burada görünsün.
      _OfferFilter.pending => list.where(
          (o) => o['status'] == 'pending' || o['status'] == 'countered'),
      _OfferFilter.accepted => list.where((o) => o['status'] == 'accepted'),
      _OfferFilter.rejected => list.where((o) => o['status'] == 'rejected'),
    };
    // Arama (iş başlığı / kategori / lokasyon)
    if (_search.trim().isNotEmpty) {
      final q = _search.trim().toLowerCase();
      list = list.where((o) {
        final job = o['job'];
        final m = job is Map ? Map<String, dynamic>.from(job) : null;
        final t = (m?['title'] as String? ?? '').toLowerCase();
        final c = (m?['category'] as String? ?? '').toLowerCase();
        final l = (m?['location'] as String? ?? '').toLowerCase();
        return t.contains(q) || c.contains(q) || l.contains(q);
      });
    }
    final out = list.toList();
    // Sıralama
    out.sort((a, b) {
      switch (_sort) {
        case _OfferSort.newest:
          return (b['createdAt'] as String? ?? '')
              .compareTo(a['createdAt'] as String? ?? '');
        case _OfferSort.oldest:
          return (a['createdAt'] as String? ?? '')
              .compareTo(b['createdAt'] as String? ?? '');
        case _OfferSort.priceHigh:
          return _priceOf(b).compareTo(_priceOf(a));
        case _OfferSort.priceLow:
          return _priceOf(a).compareTo(_priceOf(b));
      }
    });
    return out;
  }

  String _emptyMsg() {
    if (_search.trim().isNotEmpty) {
      return '"$_search" için sonuç yok.';
    }
    return switch (_filter) {
      _OfferFilter.all => 'Henüz teklif vermediniz.',
      _OfferFilter.pending => 'Bekleyen teklifiniz yok.',
      _OfferFilter.accepted => 'Kabul edilen teklifiniz yok.',
      _OfferFilter.rejected => 'Reddedilen teklifiniz yok.',
    };
  }

  Future<void> _openSortSheet() async {
    final picked = await showModalBottomSheet<_OfferSort>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Sıralama',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 8),
            ..._OfferSort.values.map((s) => ListTile(
                  leading: Icon(s.icon,
                      color: s == _sort
                          ? AppColors.primary
                          : AppColors.textSecondary),
                  title: Text(s.label,
                      style: TextStyle(
                          color: s == _sort
                              ? AppColors.primary
                              : AppColors.textPrimary,
                          fontWeight: s == _sort
                              ? FontWeight.w600
                              : FontWeight.w400)),
                  trailing: s == _sort
                      ? const Icon(Icons.check, color: AppColors.primary)
                      : null,
                  onTap: () => Navigator.pop(ctx, s),
                )),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null && picked != _sort) {
      setState(() => _sort = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offersAsync = ref.watch(myOffersProvider);

    return offersAsync.when(
      loading: () => ListSkeleton(
        itemCount: 5,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (allOffers) {
        // Phase 262 — pazarlık zincirinde sadece KÖK teklifi göster (re-counter
        // child halkaları köke senkronlandı; mükerrer kart önlenir).
        final offers =
            allOffers.where((o) => o['parentOfferId'] == null).toList();
        if (offers.isEmpty) {
          return EmptyState(
            icon: Icons.handyman_rounded,
            title: 'Henüz teklif vermediniz',
            message: 'İş ilanlarını keşfet, teklif ver ve kazanmaya başla!',
            action: ElevatedButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => const JobOpportunitiesScreen(),
              )),
              icon: const Icon(Icons.search),
              label: Text(AppLocalizations.of(context).myJobsExplore),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 12),
              ),
            ),
          );
        }
        final filtered = _apply(offers);
        final sortActive = _sort != _OfferSort.newest;
        return Column(
          children: [
            Container(
              color: AppColors.surface,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // Kategori (status) dropdown
                  Expanded(
                    child: PopupMenuButton<_OfferFilter>(
                      initialValue: _filter,
                      onSelected: (v) => setState(() => _filter = v),
                      itemBuilder: (_) => _OfferFilter.values
                          .map((f) => PopupMenuItem(
                                value: f,
                                child: Row(
                                  children: [
                                    Icon(f.icon,
                                        size: 18,
                                        color: f == _filter
                                            ? AppColors.primary
                                            : AppColors.textSecondary),
                                    const SizedBox(width: 10),
                                    Text(f.label,
                                        style: TextStyle(
                                            color: f == _filter
                                                ? AppColors.primary
                                                : AppColors.textPrimary,
                                            fontWeight: f == _filter
                                                ? FontWeight.w600
                                                : FontWeight.w400)),
                                  ],
                                ),
                              ))
                          .toList(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color:
                                  AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(_filter.icon,
                                size: 18, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_filter.label,
                                  style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13.5)),
                            ),
                            Text('${filtered.length}',
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12)),
                            const SizedBox(width: 6),
                            const Icon(Icons.arrow_drop_down,
                                color: AppColors.primary),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Arama butonu
                  _IconChipButton(
                    icon: _searchOpen ? Icons.close : Icons.search,
                    active: _searchOpen || _search.isNotEmpty,
                    tooltip: 'Ara',
                    onTap: () => setState(() {
                      _searchOpen = !_searchOpen;
                      if (!_searchOpen) {
                        _search = '';
                        _searchCtrl.clear();
                      }
                    }),
                  ),
                  const SizedBox(width: 6),
                  // Filtrele (sıralama) butonu
                  _IconChipButton(
                    icon: Icons.tune,
                    active: sortActive,
                    tooltip: 'Filtrele',
                    onTap: _openSortSheet,
                  ),
                ],
              ),
            ),
            if (_searchOpen)
              Container(
                color: AppColors.surface,
                padding:
                    const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: TextField(
                  controller: _searchCtrl,
                  autofocus: true,
                  onChanged: (v) => setState(() => _search = v),
                  decoration: InputDecoration(
                    hintText: 'İş başlığı, kategori veya konum…',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() {
                              _search = '';
                              _searchCtrl.clear();
                            }),
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                    ),
                  ),
                ),
              ),
            Expanded(
              child: _OfferList(
                offers: filtered,
                emptyMsg: _emptyMsg(),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─── Müşteri: kendi ilanları (single-role fallback) ──────────────────────────

class _CustomerJobsView extends ConsumerWidget {
  final String userId;
  final bool showAppBar;
  const _CustomerJobsView({required this.userId, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(myJobsProvider(userId));

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: showAppBar
            ? AppBar(
                title: Text(AppLocalizations.of(context).myJobsListings),
                backgroundColor: AppColors.headerBackground(context),
                foregroundColor: Colors.white,
                actions: [
                  IconButton(
                    icon: const Icon(Icons.bookmark_border),
                    tooltip: 'Şablonlarım',
                    onPressed: () => context.push('/sablonlarim'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    tooltip: 'Bildirimler',
                    onPressed: () => context.push('/bildirim-ayarlari'),
                  ),
                ],
                bottom: const TabBar(
                  tabs: [
                    Tab(text: 'Aktif'),
                    Tab(text: 'Tamamlanan'),
                    Tab(text: 'İptal Edilen'),
                  ],
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                ),
              )
            : null,
        body: Column(
          children: [
            // Phase 271 — onay bekleyen işler kartı (varsa).
            const PendingConfirmationsCard(),
            Expanded(
              child: jobsAsync.when(
                loading: () => ListSkeleton(
                    itemCount: 6,
                    itemBuilder: (_) => const JobCardSkeleton()),
                error: (e, _) => Center(child: Text('Hata: $e')),
                data: (jobs) => TabBarView(
                  children: [
                    _JobList(
                      jobs: jobs
                          .where((j) =>
                              j['status'] == 'open' ||
                              j['status'] == 'in_progress')
                          .toList(),
                      emptyMsg: 'Aktif ilanınız yok.',
                    ),
                    _JobList(
                      jobs: jobs
                          .where((j) => j['status'] == 'completed')
                          .toList(),
                      emptyMsg: 'Tamamlanan ilanınız yok.',
                    ),
                    _JobList(
                      jobs: jobs
                          .where((j) => j['status'] == 'cancelled')
                          .toList(),
                      emptyMsg: 'İptal edilen ilanınız yok.',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _JobList extends StatelessWidget {
  final List<Map<String, dynamic>> jobs;
  final String emptyMsg;
  const _JobList({required this.jobs, required this.emptyMsg});

  @override
  Widget build(BuildContext context) {
    if (jobs.isEmpty) {
      return EmptyState(
        icon: Icons.work_outline_rounded,
        title: 'Henüz iş yok',
        message: emptyMsg,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: jobs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (context, i) => _CustomerJobCard(job: jobs[i]),
    );
  }
}

class _OfferList extends StatelessWidget {
  final List<Map<String, dynamic>> offers;
  final String emptyMsg;
  const _OfferList({required this.offers, required this.emptyMsg});

  @override
  Widget build(BuildContext context) {
    if (offers.isEmpty) {
      return EmptyState(
        icon: Icons.local_offer_outlined,
        title: 'Teklif yok',
        message: emptyMsg,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      itemCount: offers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (context, i) => _WorkerOfferCard(offer: offers[i]),
    );
  }
}

class _CustomerJobCard extends ConsumerWidget {
  final Map<String, dynamic> job;
  const _CustomerJobCard({required this.job});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = job['status'] as String? ?? 'open';
    final title = job['title'] as String? ?? '';
    final category = job['category'] as String? ?? '';
    final budgetMin = (job['budgetMin'] as num?)?.toInt() ?? 0;
    final budgetMax = (job['budgetMax'] as num?)?.toInt() ?? 0;
    final createdAt = job['createdAt'] as String? ?? '';
    final dateStr = createdAt.isNotEmpty
        ? createdAt.substring(0, 10).split('-').reversed.join('.')
        : '';
    final photos =
        (job['photos'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
            [];

    final featuredUntilRaw = job['featuredUntil'] as String?;
    final featuredUntil =
        featuredUntilRaw != null ? DateTime.tryParse(featuredUntilRaw) : null;
    final isBoosted =
        featuredUntil != null && featuredUntil.isAfter(DateTime.now());
    final canBoost = status == 'open' && !isBoosted;

    final (statusLabel, statusColor) = switch (status) {
      'open' => ('Açık', Colors.green),
      'in_progress' => ('Devam Ediyor', Colors.blue),
      'completed' => ('Tamamlandı', Colors.teal),
      'cancelled' => ('İptal', Colors.red),
      _ => ('Bilinmiyor', Colors.grey),
    };

    // Phase 267 — completed/pending_grace job cards: yeşil 2px border + radius
    // ve sağ üst köşede "Hizmet Tamamlandı" rozet'i.
    final confirmationStatus = job['confirmationStatus'] as String?;
    final isCompletedVisual = status == 'completed' ||
        confirmationStatus == 'pending_grace' ||
        confirmationStatus == 'completed';

    // Phase 344 — 3D efekt uygulanıyor. Tamamlanmış işler success border'la
    // (1.5px) çerçevelenmeye devam etsin diye card3d(tint) + ek border var.
    final base3d = card3d(context, radius: 12, elevation: 1.1);
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => JobHistoryDialog.show(context, job),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: base3d.copyWith(
          border: Border.all(
            color: isCompletedVisual
                ? AppColors.success
                : (base3d.border as Border?)?.top.color ?? AppColors.border,
            width: isCompletedVisual ? 1.5 : 0.6,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                isCompletedVisual
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded,
                                color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text('Hizmet Tamamlandı',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700)),
                          ],
                        ),
                      )
                    : Container(
                        // Phase 343 — Sıkıştırılmış status badge.
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(7),
                          border: Border.all(
                              color: statusColor.withValues(alpha: 0.3),
                              width: 1),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 4,
                              height: 4,
                              margin: const EdgeInsets.only(right: 4),
                              decoration: BoxDecoration(
                                  color: statusColor, shape: BoxShape.circle),
                            ),
                            Text(statusLabel,
                                style: TextStyle(
                                    color: statusColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    height: 1.1)),
                          ],
                        ),
                      ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isBoosted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('🚀 Öne Çıkmış',
                            style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600)),
                      )
                    else if (canBoost)
                      InkWell(
                        borderRadius: BorderRadius.circular(8),
                        onTap: () async {
                          final ok = await BoostDialog.show(
                              context, job['id'] as String);
                          if (ok == true) {
                            final customerId = job['customerId'] as String?;
                            if (customerId != null) {
                              ref.invalidate(myJobsProvider(customerId));
                            }
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.3)),
                          ),
                          child: const Text('🚀 Öne Çıkar',
                              style: TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(dateStr,
                        style: TextStyle(
                            color: AppColors.textHint, fontSize: 12)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (photos.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(
                      photos.first,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 40,
                        height: 40,
                        color: AppColors.border,
                        child: Icon(Icons.image_not_supported,
                            size: 14, color: AppColors.textHint),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Expanded(
                            child: Text(category,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11)),
                          ),
                          if (budgetMin > 0 || budgetMax > 0)
                            Text(IntlFormatter.tlRange(budgetMin, budgetMax),
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    size: 18, color: AppColors.primary),
              ],
            ),
            if (status == 'completed' || status == 'cancelled') ...[
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PostJobScreen(initialJob: job),
                      ),
                    );
                  },
                  icon: const Text('🔁', style: TextStyle(fontSize: 14)),
                  label: Text(AppLocalizations.of(context).myJobsRepost),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Phase 304 — Tekliflerim header'daki kare ikon butonu (arama / filtre).
class _IconChipButton extends StatelessWidget {
  final IconData icon;
  final bool active;
  final String tooltip;
  final VoidCallback onTap;
  const _IconChipButton({
    required this.icon,
    required this.active,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary : AppColors.textSecondary;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary.withValues(alpha: 0.08)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: active
                    ? AppColors.primary.withValues(alpha: 0.3)
                    : AppColors.border),
          ),
          child: Icon(icon, size: 20, color: color),
        ),
      ),
    );
  }
}

class _WorkerOfferCard extends ConsumerWidget {
  final Map<String, dynamic> offer;
  const _WorkerOfferCard({required this.offer});

  Future<void> _withdraw(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppLocalizations.of(context).myJobsWithdrawOffer),
        content: const Text(
            'Bu teklifi geri çekiyorsun. 5 kredi iade alacaksın. Devam edilsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(AppLocalizations.of(context).cancel),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: Text(AppLocalizations.of(context).myJobsWithdraw),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    if (!context.mounted) return;

    try {
      final res =
          await ref.read(offerRepositoryProvider).withdrawOffer(jobId, offerId);
      ref.invalidate(myOffersProvider);
      ref.invalidate(tokenBalanceProvider);
      if (!context.mounted) return;
      final refunded = res['refunded'] == true;
      final amount = (res['refundAmount'] as num?)?.toInt() ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: refunded ? Colors.green : Colors.orange,
        content: Text(refunded
            ? 'Teklif geri çekildi. $amount kredi iade edildi.'
            : 'Teklif geri çekildi.'),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  // Phase 262 — gelen karşı teklifi kabul et (anlaşılan fiyatla iş başlar).
  Future<void> _acceptCounter(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;
    try {
      await ref.read(offerRepositoryProvider).acceptCounter(jobId, offerId);
      ref.invalidate(myOffersProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        backgroundColor: Colors.green,
        content: Text('Karşı teklif kabul edildi!'),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  // Phase 262 — yeniden pazarlık (teklif veren taraf için yarım kredi keser).
  Future<void> _recounter(BuildContext context, WidgetRef ref) async {
    final jobId = (offer['jobId'] as String?) ??
        (offer['job'] as Map<String, dynamic>?)?['id'] as String?;
    final offerId = offer['id'] as String?;
    if (jobId == null || offerId == null) return;
    final controller = TextEditingController(
      text: ((offer['counterPrice'] as num?) ?? (offer['price'] as num?))
              ?.toStringAsFixed(0) ??
          '',
    );
    final msgController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tekrar Teklif'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: 'Yeni fiyat (₺)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: msgController,
              decoration: const InputDecoration(
                  labelText: 'Mesaj (opsiyonel)',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            Text('Yeniden pazarlık 2.5 kredi keser.',
                style: TextStyle(fontSize: 12, color: AppColors.textHint)),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(AppLocalizations.of(context).cancel)),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Gönder')),
        ],
      ),
    );
    if (result != true) return;
    final price = double.tryParse(controller.text.trim().replaceAll(',', '.'));
    if (price == null || price <= 0) return;
    if (!context.mounted) return;
    try {
      await ref
          .read(offerRepositoryProvider)
          .counterOffer(jobId, offerId, price, msgController.text.trim());
      ref.invalidate(myOffersProvider);
      ref.invalidate(tokenBalanceProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        backgroundColor: Colors.blue,
        content: Text('Karşı teklif gönderildi.'),
      ));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: AppColors.error,
        content: Text(e.toString().replaceFirst('Exception: ', '')),
      ));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = offer['status'] as String? ?? 'pending';
    // Phase 174 fallback — price null gelirse priceMinor (kuruş) → TL'ye çevir.
    final priceMinor = (offer['priceMinor'] as num?)?.toInt();
    final counterMinor = (offer['counterPriceMinor'] as num?)?.toInt();
    final price = (offer['price'] as num?)?.toDouble()
        ?? (priceMinor != null ? priceMinor / 100 : 0.0);
    final message = offer['message'] as String? ?? '';
    final counterPrice = (offer['counterPrice'] as num?)?.toDouble()
        ?? (counterMinor != null ? counterMinor / 100 : null);
    final counterMessage = offer['counterMessage'] as String?;
    // Phase 265d — defensive cast (string id vs Map)
    final jobRaw = offer['job'];
    final job = jobRaw is Map ? Map<String, dynamic>.from(jobRaw) : null;
    final jobTitle = job?['title'] as String? ?? 'Bilinmeyen İlan';
    final jobCategory = job?['category'] as String? ?? '';
    final jobLocation = job?['location'] as String? ?? '';
    final createdAt = offer['createdAt'] as String? ?? '';
    final dateStr = createdAt.isNotEmpty
        ? createdAt.substring(0, 10).split('-').reversed.join('.')
        : '';

    final (statusLabel, statusColor) = switch (status) {
      'pending' => ('Bekliyor', Colors.orange),
      'accepted' => ('Kabul Edildi', Colors.green),
      'rejected' => ('Reddedildi', Colors.red),
      'withdrawn' => ('Geri Çekildi', Colors.grey),
      'countered' => ('Pazarlık', Colors.blue),
      _ => ('Bilinmiyor', Colors.grey),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      // Phase 344 — 3D efekt (Yapgitsin tab card pattern'i).
      decoration: card3d(context, radius: 12, elevation: 1.1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                // Phase 343 — Sıkıştırılmış offer status badge.
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(7),
                  border: Border.all(
                      color: statusColor.withValues(alpha: 0.3), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 4,
                      height: 4,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: BoxDecoration(
                          color: statusColor, shape: BoxShape.circle),
                    ),
                    Text(statusLabel,
                        style: TextStyle(
                            color: statusColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            height: 1.1)),
                  ],
                ),
              ),
              Text(dateStr,
                  style:
                      TextStyle(color: AppColors.textHint, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 6),
          Text(jobTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
          const SizedBox(height: 2),
          Row(
            children: [
              if (jobCategory.isNotEmpty)
                Text(jobCategory,
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 11)),
              if (jobCategory.isNotEmpty && jobLocation.isNotEmpty)
                Text(' • ',
                    style:
                        TextStyle(color: AppColors.textHint, fontSize: 11)),
              if (jobLocation.isNotEmpty)
                Expanded(
                  child: Text(jobLocation,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: AppColors.textHint, fontSize: 11)),
                ),
            ],
          ),
          if (message.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(message,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 11, color: AppColors.textSecondary)),
          ],
          if (counterPrice != null) ...[
            const SizedBox(height: 6),
            // Phase 343 — Sıkıştırılmış Karşı Teklif chip.
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.swap_horiz_rounded,
                        size: 12, color: Colors.blue.shade700),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        'Karşı Teklif: ${IntlFormatter.currency(context, counterPrice, decimalDigits: 0)}',
                        style: TextStyle(
                            color: Colors.blue.shade700,
                            fontWeight: FontWeight.w700,
                            fontSize: 11),
                      ),
                    ),
                  ]),
                  if (counterMessage != null && counterMessage.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2, left: 16),
                      child: Text(counterMessage,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              color: Colors.blue.shade600, fontSize: 10.5)),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 4),
          Text('Teklifiniz: ${IntlFormatter.currency(context, price, decimalDigits: 0)}',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12)),
          // Phase 262 — karşı teklif geldiğinde: Kabul Et + Tekrar Teklif.
          if (status == 'countered') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _acceptCounter(context, ref),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Kabul Et'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _recounter(context, ref),
                    icon: const Icon(Icons.handshake_outlined, size: 16),
                    label: const Text('Tekrar Teklif'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.blue,
                      side: const BorderSide(color: Colors.blue),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (status == 'pending' || status == 'countered') ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _withdraw(context, ref),
                icon: const Icon(Icons.undo, size: 16),
                label: Text(AppLocalizations.of(context).myJobsWithdraw),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.error,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}


/// Phase 325 — İşlemlerim sekmesi içine kompakt randevu liste görünümü.
/// Eski `/takvim` ekranı tam featured kalır; bu tab hızlı bakış.
class _BookingsCalendarTab extends ConsumerWidget {
  const _BookingsCalendarTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myCustomerBookingsProvider);
    return async.when(
      loading: () => ListSkeleton(
        itemCount: 4,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Randevular yüklenemedi: $e',
              style: const TextStyle(color: AppColors.error)),
        ),
      ),
      data: (bookings) {
        if (bookings.isEmpty) {
          return const EmptyState(
            icon: Icons.event_busy_outlined,
            title: 'Randevu yok',
            message:
                'Onayladığın ya da bekleyen randevular burada listelenecek.',
          );
        }
        final sorted = [...bookings]
          ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(myCustomerBookingsProvider),
          // Phase 345 — Yapgitsin pattern: separator ile 6px boşluk.
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
            itemCount: sorted.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (_, i) {
              final b = sorted[i];
              return _CompactBookingRow(booking: b);
            },
          ),
        );
      },
    );
  }
}

class _CompactBookingRow extends StatelessWidget {
  final Booking booking;
  const _CompactBookingRow({required this.booking});

  Color get _statusColor {
    switch (booking.status) {
      case BookingStatus.completed:  return Colors.green;
      case BookingStatus.cancelled:  return Colors.red;
      case BookingStatus.in_progress: return Colors.orange;
      case BookingStatus.confirmed:  return Colors.blue;
      default:                       return Colors.grey;
    }
  }

  IconData get _statusIcon {
    switch (booking.status) {
      case BookingStatus.completed:  return Icons.check;
      case BookingStatus.cancelled:  return Icons.close;
      case BookingStatus.in_progress: return Icons.work;
      case BookingStatus.confirmed:  return Icons.event_available;
      default:                       return Icons.timer;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                BookingDetailScreen(booking: booking, asWorker: false),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: _statusColor,
                child: Icon(_statusIcon, color: Colors.white, size: 14),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(booking.category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(booking.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 11, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${booking.scheduledDate.day}/${booking.scheduledDate.month}',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    booking.scheduledTime ?? '--:--',
                    style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
