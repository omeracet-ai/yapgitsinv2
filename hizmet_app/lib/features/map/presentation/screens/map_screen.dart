import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../providers/map_provider.dart';
import '../../data/map_repository.dart';
import '../widgets/job_pin_marker.dart';
import '../widgets/worker_map_marker.dart';
import '../../../../../core/providers/navigation_provider.dart';
import '../../../jobs/data/job_filter.dart';
import '../../../jobs/widgets/job_filter_sheet.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();
  bool _hasInitialFit = false;

  // Phase 180 — fitBounds helper. Tüm pin'leri + kullanıcı konumunu kapsayan
  // LatLngBounds döndürür. Boş listede null.
  LatLngBounds? _boundsFromPoints(List<LatLng> points) {
    if (points.isEmpty) return null;
    double minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    return LatLngBounds(LatLng(minLat, minLng), LatLng(maxLat, maxLng));
  }

  void _maybeFitInitial(MapState s, {required bool includeWorkers}) {
    if (_hasInitialFit) return;
    final points = <LatLng>[
      for (final j in s.jobs)
        if (j.latitude != null && j.longitude != null)
          LatLng(j.latitude!, j.longitude!),
      // Phase 292 — Worker pin'leri yalnızca usta hesaplarda görünür; initial
      // fit bounds da bu kullanıcıda worker noktalarını dahil eder.
      if (includeWorkers)
        for (final w in s.workers)
          if (w.latitude != null && w.longitude != null)
            LatLng(w.latitude!, w.longitude!),
      if (s.userLocation != null) s.userLocation!,
    ];
    if (points.isEmpty) return; // hiç pin yok → default zoom
    _hasInitialFit = true;
    if (points.length == 1) {
      // Tek pin → orta-zoom
      _mapController.move(points.first, 13);
      return;
    }
    final bounds = _boundsFromPoints(points);
    if (bounds == null) return;
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.all(50),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    // Phase 179 — Post-frame callback + try/catch. Microtask içinde provider
    // init throw ederse uncaught error olarak swallow oluyordu; artık explicit
    // logger + UI fallback'i provider tarafında garanti.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      try {
        await ref.read(mapProvider.notifier).init();
        // Phase 297 — Yapgitsin filter sheet'ten gelen radius/category
        // ayarlarını haritaya yansıt.
        final f = ref.read(jobFilterProvider);
        if (f.maxRadiusKm != null) {
          ref.read(mapProvider.notifier).setRadiusKm(f.maxRadiusKm);
        }
      } catch (e, st) {
        debugPrint('map_screen.init error: $e\n$st');
      }
    });
  }

  @override
  void dispose() {
    // Phase 297 — Harita full-page route olarak açıldığında pop sonrası
    // mapShowWorkersOverride'ı sıfırla (Yapgitsin bottom-nav'da değil artık,
    // selectedTabProvider listener yetersiz). Üst-seviye container disposed
    // olunca ref yine erişilebilir; en güvenli yol post-frame microtask.
    Future.microtask(() {
      try {
        ref.read(mapShowWorkersOverrideProvider.notifier).state = false;
      } catch (_) {
        // ProviderContainer disposed olduysa boş geç.
      }
    });
    _mapController.dispose();
    super.dispose();
  }

  // Phase 369 — kategori bottom sheet: 3D dark gradient + drag handle.
  void _showCategorySheet(MapState state, MapNotifier notifier) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) {
        return _CategoryBottomSheet(
          activeFilter: state.activeFilter,
          onSelect: (cat) {
            notifier.setFilter(cat);
            Navigator.of(sheetCtx).pop();
          },
        );
      },
    );
  }

  Future<void> _openFilterSheet() async {
    final current = ref.read(jobFilterProvider);
    final result = await showModalBottomSheet<JobFilter>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => JobFilterSheet(initial: current),
    );
    if (result != null) {
      ref.read(jobFilterProvider.notifier).state = result;
      // Mesafe filtresi haritaya da yansıt.
      if (result.maxRadiusKm != null) {
        ref.read(mapProvider.notifier).setRadiusKm(result.maxRadiusKm);
      }
    }
  }

  void _focusSearch() {
    // Phase 369 — Listeye geç (search inputu öne çıkar). Stub: list view'a düş.
    final m = ref.read(mapProvider);
    if (!m.showList) ref.read(mapProvider.notifier).toggleView();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapProvider);
    final notifier = ref.read(mapProvider.notifier);

    // Phase 292c — Worker pin'leri hiçbir kullanıcı tipi için varsayılan
    // değildir. Yalnızca "Hızlı Hizmet Verenlere Ulaş" CTA'sından gelen
    // geçici override aktifken render edilirler; Harita sekmesinden ayrılınca
    // override otomatik sıfırlanır.
    final showWorkersOverride = ref.watch(mapShowWorkersOverrideProvider);
    final showWorkers = showWorkersOverride;

    // Phase 297 — Harita artık full-page route, bottom-nav listener'ı
    // kullanılmıyor. Override sıfırlama dispose()'a taşındı.

    // Phase 180 — İlk açılışta tüm pin'leri + user'ı kapsayan fitBounds.
    // Jobs/workers/userLocation herhangi biri değiştiğinde bir kez tetiklenir.
    ref.listen(mapProvider, (_, next) {
      if (!_hasInitialFit) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _maybeFitInitial(next, includeWorkers: showWorkers);
        });
      }
    });

    final selectedJob = state.selectedJobId != null && state.jobs.isNotEmpty
        ? state.jobs.where((j) => j.id == state.selectedJobId).firstOrNull
        : null;

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: state.showList
          ? Stack(
              children: [
                Column(
                  children: [
                    _FloatingHeader(
                      state: state,
                      notifier: notifier,
                      onOpenCategorySheet: () =>
                          _showCategorySheet(state, notifier),
                      onOpenFilter: _openFilterSheet,
                      onOpenNotifications: () => context.push('/bildirimler'),
                      onSearch: _focusSearch,
                    ),
                    Expanded(
                      child: _JobListView(
                        jobs: state.jobs,
                        onTap: (j) => notifier.selectJob(j.id),
                      ),
                    ),
                  ],
                ),
                Positioned(
                  top: MediaQuery.of(context).padding.top + 12,
                  left: 12,
                  child: Material(
                    color: AppColors.surface,
                    elevation: 4,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () {
                        if (Navigator.of(context).canPop()) {
                          Navigator.of(context).pop();
                        } else {
                          context.go('/');
                        }
                      },
                      child: SizedBox(
                        width: 40,
                        height: 40,
                        child: Icon(Icons.arrow_back_rounded,
                            size: 22, color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                ),
              ],
            )
          : Stack(
              children: [
                // ── Full-screen map ──
                _MapView(
                  state: state,
                  mapController: _mapController,
                  showWorkers: showWorkers,
                  onPinTap: (j) => notifier.selectJob(j.id),
                  onWorkerTap: (w) {
                    notifier.selectWorker(w.id);
                    // Phase 178 — Direkt usta profiline yönlendir.
                    context.push('/usta/${w.id}');
                  },
                  onMapTap: () {
                    notifier.selectJob(null);
                    notifier.selectWorker(null);
                  },
                ),

                // ── Floating search bar + category dropdown + action icons ──
                _FloatingOverlay(
                  state: state,
                  notifier: notifier,
                  onOpenCategorySheet: () => _showCategorySheet(state, notifier),
                  onOpenFilter: _openFilterSheet,
                  onOpenNotifications: () => context.push('/bildirimler'),
                  onSearch: _focusSearch,
                ),

                // Phase 540 — Geri butonu. Harita full-screen scaffold
                // içindeydi + AppBar yoktu → kullanıcı ekrandan çıkamıyordu
                // (mahsur kalıyordu). Sol üstte SafeArea altında mini FAB.
                Positioned(
                  top: MediaQuery.of(context).padding.top + 12,
                  left: 12,
                  child: Material(
                    color: AppColors.surface,
                    elevation: 4,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () {
                        if (Navigator.of(context).canPop()) {
                          Navigator.of(context).pop();
                        } else {
                          context.go('/');
                        }
                      },
                      child: SizedBox(
                        width: 40,
                        height: 40,
                        child: Icon(Icons.arrow_back_rounded,
                            size: 22, color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                ),

                // ── Loading indicator ──
                if (state.locationLoading)
                  const Center(child: CircularProgressIndicator()),

                // ── Error banner ──
                if (state.error != null)
                  _ErrorBanner(
                    message: state.error!,
                    onRetry: notifier.refresh,
                    showOpenSettings: state.permissionPermanentlyDenied,
                  ),

                // Phase 540c — "N ilan" badge artık _CategoryToolbar Row'unun
                // sonunda; ayrı Positioned katmanı kaldırıldı.

                // ── Locate me FAB ──
                if (state.userLocation != null)
                  Positioned(
                    bottom: selectedJob != null ? 196 : 24,
                    right: 16,
                    child: FloatingActionButton.small(
                      heroTag: 'locate',
                      backgroundColor: AppColors.surface,
                      elevation: 4,
                      onPressed: () =>
                          _mapController.move(state.userLocation!, 15),
                      child: const Icon(Icons.my_location,
                          color: AppColors.primary),
                    ),
                  ),

                // ── Selected job bottom card ──
                if (selectedJob != null)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: _AirtaskerCard(
                      job: selectedJob,
                      onClose: () => notifier.selectJob(null),
                    ),
                  ),
              ],
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating header used in list-view mode
// ─────────────────────────────────────────────────────────────────────────────

class _FloatingHeader extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;
  final VoidCallback onOpenCategorySheet;
  final VoidCallback onOpenFilter;
  final VoidCallback onOpenNotifications;
  final VoidCallback onSearch;

  const _FloatingHeader({
    required this.state,
    required this.notifier,
    required this.onOpenCategorySheet,
    required this.onOpenFilter,
    required this.onOpenNotifications,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      color: AppColors.surface,
      // Phase 540 — sol 60px back butonu için ayrıldı.
      padding: EdgeInsets.fromLTRB(60, top + 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SearchPill(state: state, notifier: notifier),
          const SizedBox(height: 8),
          _CategoryToolbar(
            state: state,
            onOpenCategorySheet: onOpenCategorySheet,
            onOpenFilter: onOpenFilter,
            onOpenNotifications: onOpenNotifications,
            onSearch: onSearch,
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating overlay (search bar + category dropdown + action icons) on map
// ─────────────────────────────────────────────────────────────────────────────

class _FloatingOverlay extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;
  final VoidCallback onOpenCategorySheet;
  final VoidCallback onOpenFilter;
  final VoidCallback onOpenNotifications;
  final VoidCallback onSearch;

  const _FloatingOverlay({
    required this.state,
    required this.notifier,
    required this.onOpenCategorySheet,
    required this.onOpenFilter,
    required this.onOpenNotifications,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Positioned(
      // Phase 540 — sol 60px back butonu için ayrıldı (search pill sağa kaydı).
      top: top + 12,
      left: 60,
      right: 12,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SearchPill(state: state, notifier: notifier),
          const SizedBox(height: 8),
          _CategoryToolbar(
            state: state,
            onOpenCategorySheet: onOpenCategorySheet,
            onOpenFilter: onOpenFilter,
            onOpenNotifications: onOpenNotifications,
            onSearch: onSearch,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 369 — Kategori dropdown pill + action icons (search/filter/bell)
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryToolbar extends StatelessWidget {
  final MapState state;
  final VoidCallback onOpenCategorySheet;
  final VoidCallback onOpenFilter;
  final VoidCallback onOpenNotifications;
  final VoidCallback onSearch;

  const _CategoryToolbar({
    required this.state,
    required this.onOpenCategorySheet,
    required this.onOpenFilter,
    required this.onOpenNotifications,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final activeLabel =
        state.activeFilter == 'all' ? 'Tümü' : state.activeFilter;
    // Phase 540d — Tek satır, kenardan kenara yay: kategori pill + arama +
    // filtre + bildirim + "N ilan" chip. spaceBetween ile sağ+sol boşluklar
    // eşit dağılır → içerik tüm mevcut genişliği kaplar.
    return Row(
      mainAxisSize: MainAxisSize.max,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        GestureDetector(
          onTap: onOpenCategorySheet,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x18000000),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  state.activeFilter == 'all'
                      ? Icons.apps_rounded
                      : _categoryIcon(state.activeFilter),
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 6),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 96),
                  child: Text(
                    activeLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                const SizedBox(width: 2),
                Icon(Icons.keyboard_arrow_down_rounded,
                    size: 18, color: AppColors.textSecondary),
              ],
            ),
          ),
        ),
        _CircleIconBtn(icon: Icons.search_rounded, onTap: onSearch),
        _CircleIconBtn(icon: Icons.tune_rounded, onTap: onOpenFilter),
        // Phase 490 — tüm sekmelerde aynı bell ikonu (notifications_outlined).
        _CircleIconBtn(
            icon: Icons.notifications_outlined,
            onTap: onOpenNotifications),
        if (state.jobs.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x18000000),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              '${state.jobs.length} ilan',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
      ],
    );
  }
}

class _CircleIconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleIconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          boxShadow: const [
            BoxShadow(
              color: Color(0x18000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 18, color: AppColors.textPrimary),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 369 — 3D dark category bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryBottomSheet extends StatelessWidget {
  final String activeFilter;
  final void Function(String) onSelect;

  const _CategoryBottomSheet({
    required this.activeFilter,
    required this.onSelect,
  });

  // Backend ile uyumlu örnekleme. Tümü + en sık 5 kategori.
  static const _items = <_CatItem>[
    _CatItem('all', 'Tümü', Icons.apps_rounded),
    _CatItem('Elektrikçi', 'Elektrikçi', Icons.bolt_rounded),
    _CatItem('Tesisat', 'Tesisat', Icons.plumbing_rounded),
    _CatItem('Temizlik', 'Temizlik', Icons.cleaning_services_rounded),
    _CatItem('Boya & Badana', 'Boya & Badana', Icons.format_paint_rounded),
    _CatItem('Nakliyat', 'Nakliyat', Icons.local_shipping_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    const bgTop = Color(0xFF1A1F2E);
    const bgBot = Color(0xFF0C1117);
    final highlight = Colors.white.withValues(alpha: 0.08);

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [bgTop, bgBot],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
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
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Row(
                children: [
                  Icon(Icons.filter_list_rounded,
                      size: 16,
                      color: AppColors.primary.withValues(alpha: 0.85)),
                  const SizedBox(width: 8),
                  const Text(
                    'Kategori Seç',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ..._items.map((it) {
              final selected = it.key == activeFilter;
              return InkWell(
                onTap: () => onSelect(it.key),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              AppColors.primary.withValues(
                                  alpha: selected ? 0.32 : 0.15),
                              AppColors.primary.withValues(
                                  alpha: selected ? 0.10 : 0.04),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors.primary.withValues(
                                alpha: selected ? 0.55 : 0.25),
                            width: 1,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Icon(it.icon,
                            size: 18, color: AppColors.primary),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          it.label,
                          style: TextStyle(
                            color: Colors.white
                                .withValues(alpha: selected ? 1 : 0.85),
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      // Checkbox (3D-style ring + fill when selected).
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(7),
                          border: Border.all(
                            color: selected
                                ? AppColors.primary
                                : Colors.white.withValues(alpha: 0.30),
                            width: 1.5,
                          ),
                          boxShadow: selected
                              ? [
                                  BoxShadow(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.45),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: selected
                            ? const Icon(Icons.check_rounded,
                                size: 14, color: Colors.white)
                            : null,
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _CatItem {
  final String key;
  final String label;
  final IconData icon;
  const _CatItem(this.key, this.label, this.icon);
}

// ─────────────────────────────────────────────────────────────────────────────
// Search pill widget
// ─────────────────────────────────────────────────────────────────────────────

class _SearchPill extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;

  const _SearchPill({required this.state, required this.notifier});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
              color: Color(0x20000000),
              blurRadius: 12,
              offset: Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.search, color: Colors.grey, size: 18),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Yakınımdaki ilanlar',
              style: TextStyle(
                  color: Color(0xFFAAAAAA),
                  fontSize: 13),
            ),
          ),
          // List / Map toggle
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F3F9),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ToggleBtn(
                  icon: Icons.view_list_rounded,
                  label: 'Liste',
                  active: state.showList,
                  onTap: () {
                    if (!state.showList) notifier.toggleView();
                  },
                ),
                _ToggleBtn(
                  icon: Icons.map_rounded,
                  label: 'Harita',
                  active: !state.showList,
                  onTap: () {
                    if (state.showList) notifier.toggleView();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ToggleBtn({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: active
              ? [
                  const BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 4,
                      offset: Offset(0, 1))
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 13,
              color: active ? AppColors.primary : Colors.grey,
            ),
            const SizedBox(width: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: active ? AppColors.primary : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Phase 272 — Kategori → ikon eşleştirmesi. Pin + pop-up'ta paylaşılır.
IconData _categoryIcon(String category) {
  switch (category) {
    case 'Elektrikçi':
      return Icons.bolt_rounded;
    case 'Tesisat':
      return Icons.plumbing_rounded;
    case 'Temizlik':
      return Icons.cleaning_services_rounded;
    case 'Boya & Badana':
      return Icons.format_paint_rounded;
    case 'Nakliyat':
      return Icons.local_shipping_rounded;
    default:
      return Icons.build_rounded;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Harita görünümü
// ─────────────────────────────────────────────────────────────────────────────

class _MapView extends StatelessWidget {
  final MapState state;
  final MapController mapController;
  final void Function(NearbyJob) onPinTap;
  final void Function(NearbyWorker) onWorkerTap;
  final VoidCallback onMapTap;
  /// Phase 292 — Worker pin'lerini sadece "hizmet ilanı veren" hesaplara çiz.
  final bool showWorkers;

  const _MapView({
    required this.state,
    required this.mapController,
    required this.onPinTap,
    required this.onWorkerTap,
    required this.onMapTap,
    required this.showWorkers,
  });

  @override
  Widget build(BuildContext context) {
    // Phase 254 — Admin map parity. Türkiye merkezi default (admin AdminMap.tsx).
    final center = state.userLocation ?? const LatLng(39.0, 35.0);
    final initialZoom = state.userLocation != null ? 14.0 : 6.0;

    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: initialZoom,
        minZoom: 5,
        maxZoom: 18,
        onTap: (_, __) => onMapTap(),
      ),
      children: [
        // Phase 267 — Grayscale OSM (luminance matrix → beyaz-siyah düz görsel).
        // Markers/circles üzerinde değil, sadece tile layer altında uygulanır.
        ColorFiltered(
          colorFilter: const ColorFilter.matrix(<double>[
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0,      0,      0,      1, 0,
          ]),
          child: TileLayer(
            urlTemplate:
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.yapgitsin.hizmet_app',
            retinaMode: RetinaMode.isHighDensity(context),
          ),
        ),
        if (state.userLocation != null)
          CircleLayer(
            circles: [
              CircleMarker(
                point: state.userLocation!,
                radius: 20,
                color: AppColors.primary.withValues(alpha: 0.15),
                borderColor: Colors.transparent,
                borderStrokeWidth: 0,
                useRadiusInMeter: false,
              ),
              CircleMarker(
                point: state.userLocation!,
                radius: 7,
                color: AppColors.primary,
                borderColor: Colors.white,
                borderStrokeWidth: 2,
                useRadiusInMeter: false,
              ),
            ],
          ),
        MarkerLayer(
          markers: state.jobs
              .where((j) => j.latitude != null && j.longitude != null)
              .map((j) {
            final isSelected = j.id == state.selectedJobId;
            // Phase 272 — 3D pin marker. ApproxBadge ile birlikte ~50x60 hit area.
            const w = 50.0;
            const h = 64.0;
            return Marker(
              point: LatLng(j.latitude!, j.longitude!),
              width: w,
              height: h,
              alignment: Alignment.topCenter,
              child: JobPinMarker(
                icon: _categoryIcon(j.category),
                color: AppColors.primary,
                isSelected: isSelected,
                isFeatured: j.featuredOrder != null,
                isApprox: j.locationApprox,
                onTap: () => onPinTap(j),
              ),
            );
          }).toList(),
        ),
        // Phase 178 + 292 — Yakındaki ustalar (mavi pill). Jobs üstüne çizilir;
        // seçili usta turuncu jobs'tan ayırt edilebilir. Yalnızca usta hesapları
        // (workerCategories dolu) için render edilir — normal müşteri haritada
        // sadece iş ilanı pin'lerini görür.
        if (showWorkers)
          MarkerLayer(
            markers: state.workers
                .where((w) => w.latitude != null && w.longitude != null)
                .map((w) {
              final isSelected = w.id == state.selectedWorkerId;
              final width = isSelected ? 96.0 : 84.0;
              final height = isSelected ? 46.0 : 38.0;
              return Marker(
                point: LatLng(w.latitude!, w.longitude!),
                width: width,
                height: height,
                child: GestureDetector(
                  onTap: () => onWorkerTap(w),
                  child: WorkerMapMarker(
                    name: w.name,
                    rating: w.rating,
                    isSelected: isSelected,
                    isVerified: w.identityVerified,
                    isApprox: w.locationApprox,
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste görünümü — kept as-is
// ─────────────────────────────────────────────────────────────────────────────

class _JobListView extends StatelessWidget {
  final List<NearbyJob> jobs;
  final void Function(NearbyJob) onTap;

  const _JobListView({required this.jobs, required this.onTap});

  static String _icon(String category) {
    const icons = {
      'Elektrikçi': 'âš¡',
      'Tesisat': '🔧',
      'Temizlik': '🧹',
      'Boya & Badana': '🖌',
      'Nakliyat': '🚛',
    };
    return icons[category] ?? '🔨';
  }

  @override
  Widget build(BuildContext context) {
    if (jobs.isEmpty) {
      return const Center(
        child: Text(
          'Bu bölgede ilan bulunamadı',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: jobs.length,
      itemBuilder: (_, i) {
        final j = jobs[i];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFFFF3E0),
            child:
                Text(_icon(j.category), style: const TextStyle(fontSize: 18)),
          ),
          title: Text(j.title,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(
            '${j.location} · ${j.distanceKm.toStringAsFixed(1)} km',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          trailing:
              const Icon(Icons.chevron_right, color: Colors.grey),
          onTap: () => onTap(j),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 267 — Yapgitsin logolu 3D Dark Pop-up
// Harita grayscale (ColorFiltered), pop-up dark mode (intentional — light tema'da
// da dark kalır). Gradient bg + üst highlight + alt shadow ile 3D efekt.
// ─────────────────────────────────────────────────────────────────────────────

class _AirtaskerCard extends StatelessWidget {
  final NearbyJob job;
  final VoidCallback onClose;

  const _AirtaskerCard({required this.job, required this.onClose});

  static IconData _iconFor(String category) => _categoryIcon(category);

  @override
  Widget build(BuildContext context) {
    // 3D dark palette — light/dark temadan bağımsız sabit dark kart.
    const bgTop = Color(0xFF1A1F2E);
    const bgBot = Color(0xFF0C1117);
    final highlight = Colors.white.withValues(alpha: 0.08);
    final budget = job.budgetMin != null
        ? '₺${job.budgetMin!.toStringAsFixed(0)}${job.budgetMax != null ? ' - ₺${job.budgetMax!.toStringAsFixed(0)}' : ''}'
        : null;

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [bgTop, bgBot],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: highlight, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.45),
            blurRadius: 24,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Drag handle ──
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // ── Header: Yapgitsin logo + close ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.asset(
                    'assets/icons/app_icon.png',
                    width: 22,
                    height: 22,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'yapgitsin.',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    letterSpacing: -0.2,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: onClose,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.06),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.close_rounded,
                        size: 16,
                        color: Colors.white.withValues(alpha: 0.7)),
                  ),
                ),
              ],
            ),
          ),

          // ── Main content ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category icon — koyu plate + primary glow
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primary.withValues(alpha: 0.25),
                        AppColors.primary.withValues(alpha: 0.05),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.35),
                        width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    _iconFor(job.category),
                    size: 26,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Colors.white,
                          height: 1.2,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          // Category chip — yeşil primary
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary
                                  .withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: AppColors.primary
                                      .withValues(alpha: 0.35),
                                  width: 1),
                            ),
                            child: Text(
                              job.category,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          if (budget != null) ...[
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                budget,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFFFC542),
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.location_on_rounded,
                              size: 12,
                              color: Colors.white.withValues(alpha: 0.55)),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              '${job.location} · ${job.distanceKm.toStringAsFixed(1)} km',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.white.withValues(alpha: 0.65),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // ── Phase 272 — Poster mini-card section ──
          if (job.poster != null)
            _PosterMiniSection(poster: job.poster!),

          // ── Action buttons ──
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                Expanded(
                  flex: 6,
                  child: ElevatedButton(
                    onPressed: () => context.push('/ilan/${job.id}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      elevation: 6,
                      shadowColor:
                          AppColors.primary.withValues(alpha: 0.5),
                    ),
                    child: const Text(
                      'İlan Detayı',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 4,
                  child: OutlinedButton(
                    onPressed: () => context.push('/ilan/${job.id}'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      backgroundColor:
                          Colors.white.withValues(alpha: 0.04),
                      side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.18),
                          width: 1),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Teklif',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: Colors.white)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded,
                            size: 14, color: Colors.white),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 272 — Poster mini-card section
// 3D dark pop-up'ın alt kısmında "İlanı Açan" satırı: avatar + isim + verified
// rozet + mini stats + "Profili Aç" CTA. Glassmorphic divider üst ayrımı verir.
// ─────────────────────────────────────────────────────────────────────────────

class _PosterMiniSection extends StatelessWidget {
  final NearbyJobPoster poster;

  const _PosterMiniSection({required this.poster});

  String get _initials {
    final name = poster.fullName?.trim();
    if (name == null || name.isEmpty) return '?';
    final parts = name.split(RegExp(r'\s+'));
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final successRate = poster.asCustomerTotal > 0
        ? ((poster.asCustomerSuccess / poster.asCustomerTotal) * 100).round()
        : null;
    final rating = poster.averageRating;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.08),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.person_outline_rounded,
                  size: 11,
                  color: Colors.white.withValues(alpha: 0.55)),
              const SizedBox(width: 4),
              Text(
                'İLANI AÇAN',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: Colors.white.withValues(alpha: 0.55),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // ── Avatar ──
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primary.withValues(alpha: 0.30),
                          AppColors.primary.withValues(alpha: 0.10),
                        ],
                      ),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.18),
                        width: 1,
                      ),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: poster.profileImageUrl != null &&
                            poster.profileImageUrl!.isNotEmpty
                        ? Image.network(
                            poster.profileImageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _initialsAvatar(),
                          )
                        : _initialsAvatar(),
                  ),
                  if (poster.identityVerified)
                    Positioned(
                      bottom: -2,
                      right: -2,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: const BoxDecoration(
                          color: Color(0xFF1A1F2E),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 10),
              // ── Name + stats ──
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      poster.fullName ?? 'İsimsiz Kullanıcı',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        if (rating != null && rating > 0) ...[
                          const Icon(Icons.star_rounded,
                              size: 12, color: Color(0xFFFFC542)),
                          const SizedBox(width: 2),
                          Text(
                            rating.toStringAsFixed(1),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Icon(Icons.work_outline_rounded,
                            size: 11,
                            color: Colors.white.withValues(alpha: 0.55)),
                        const SizedBox(width: 3),
                        Text(
                          '${poster.asCustomerTotal} iş',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.70),
                          ),
                        ),
                        if (successRate != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            '·  %$successRate başarı',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.white.withValues(alpha: 0.55),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // ── CTA ──
              TextButton(
                onPressed: () => context.push('/musteri/${poster.id}'),
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  backgroundColor:
                      AppColors.primary.withValues(alpha: 0.15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: AppColors.primary.withValues(alpha: 0.40),
                      width: 1,
                    ),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Profil',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 2),
                    Icon(Icons.arrow_forward_rounded,
                        size: 12, color: AppColors.primary),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _initialsAvatar() => Container(
        alignment: Alignment.center,
        child: Text(
          _initials,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hata banner — kept as-is
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  // Phase 540O — deniedForever senaryosunda ekstra "Ayarları Aç" CTA.
  final bool showOpenSettings;

  const _ErrorBanner({
    required this.message,
    required this.onRetry,
    this.showOpenSettings = false,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        color: Colors.amber.shade100,
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                size: 16, color: Colors.orange),
            const SizedBox(width: 8),
            Expanded(
                child: Text(message,
                    style: TextStyle(fontSize: 11, color: Colors.amber.shade900))),
            if (showOpenSettings)
              TextButton(
                onPressed: () async {
                  await Geolocator.openAppSettings();
                },
                child: Text('Ayarlar',
                    style: TextStyle(
                        fontSize: 11, color: Colors.amber.shade900)),
              ),
            TextButton(
              onPressed: onRetry,
              child: Text('Yenile',
                  style: TextStyle(fontSize: 11, color: Colors.amber.shade900)),
            ),
          ],
        ),
      ),
    );
  }
}
