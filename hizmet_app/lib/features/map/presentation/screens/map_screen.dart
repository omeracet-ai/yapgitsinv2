import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../providers/map_provider.dart';
import '../../data/map_repository.dart';
import '../widgets/job_map_marker.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(mapProvider.notifier).init());
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapProvider);
    final notifier = ref.read(mapProvider.notifier);

    ref.listen(mapProvider.select((s) => s.userLocation), (_, loc) {
      if (loc != null) _mapController.move(loc, 14.0);
    });

    final selectedJob = state.selectedJobId != null && state.jobs.isNotEmpty
        ? state.jobs.where((j) => j.id == state.selectedJobId).firstOrNull
        : null;

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: state.showList
          ? Column(
              children: [
                _FloatingHeader(state: state, notifier: notifier),
                Expanded(
                  child: _JobListView(
                    jobs: state.jobs,
                    onTap: (j) => notifier.selectJob(j.id),
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
                  onPinTap: (j) => notifier.selectJob(j.id),
                  onMapTap: () => notifier.selectJob(null),
                ),

                // ── Floating search bar + category chips overlay ──
                _FloatingOverlay(state: state, notifier: notifier),

                // ── Loading indicator ──
                if (state.locationLoading)
                  const Center(child: CircularProgressIndicator()),

                // ── Error banner ──
                if (state.error != null)
                  _ErrorBanner(
                    message: state.error!,
                    onRetry: notifier.refresh,
                  ),

                // ── Job count badge (top-right, below chips) ──
                if (!state.locationLoading && state.jobs.isNotEmpty)
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 106,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x18000000),
                              blurRadius: 6,
                              offset: Offset(0, 2))
                        ],
                      ),
                      child: Text(
                        '${state.jobs.length} ilan',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary),
                      ),
                    ),
                  ),

                // ── Locate me FAB ──
                if (state.userLocation != null)
                  Positioned(
                    bottom: selectedJob != null ? 196 : 24,
                    right: 16,
                    child: FloatingActionButton.small(
                      heroTag: 'locate',
                      backgroundColor: Colors.white,
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

  const _FloatingHeader({required this.state, required this.notifier});

  static const _categories = [
    'all',
    'Elektrikçi',
    'Tesisat',
    'Temizlik',
    'Boya & Badana',
    'Nakliyat',
  ];

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      color: Colors.white,
      padding: EdgeInsets.fromLTRB(12, top + 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SearchPill(state: state, notifier: notifier),
          const SizedBox(height: 8),
          _CategoryChips(state: state, notifier: notifier, categories: _categories),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating overlay (search bar + chips) on top of map
// ─────────────────────────────────────────────────────────────────────────────

class _FloatingOverlay extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;

  const _FloatingOverlay({required this.state, required this.notifier});

  static const _categories = [
    'all',
    'Elektrikçi',
    'Tesisat',
    'Temizlik',
    'Boya & Badana',
    'Nakliyat',
  ];

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Positioned(
      top: top + 12,
      left: 12,
      right: 12,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SearchPill(state: state, notifier: notifier),
          const SizedBox(height: 8),
          _CategoryChips(
              state: state,
              notifier: notifier,
              categories: _categories),
        ],
      ),
    );
  }
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
      decoration: BoxDecoration(
        color: Colors.white,
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

// ─────────────────────────────────────────────────────────────────────────────
// Category chips row
// ─────────────────────────────────────────────────────────────────────────────

class _CategoryChips extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;
  final List<String> categories;

  const _CategoryChips({
    required this.state,
    required this.notifier,
    required this.categories,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 32,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: categories.map((cat) {
          final isActive = state.activeFilter == cat;
          final label = cat == 'all' ? 'Tümü' : cat;
          return GestureDetector(
            onTap: () => notifier.setFilter(cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(right: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: isActive
                        ? AppColors.primary.withValues(alpha: 0.30)
                        : const Color(0x14000000),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isActive ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
          );
        }).toList(),
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

// ─────────────────────────────────────────────────────────────────────────────
// Harita görünümü
// ─────────────────────────────────────────────────────────────────────────────

class _MapView extends StatelessWidget {
  final MapState state;
  final MapController mapController;
  final void Function(NearbyJob) onPinTap;
  final VoidCallback onMapTap;

  const _MapView({
    required this.state,
    required this.mapController,
    required this.onPinTap,
    required this.onMapTap,
  });

  @override
  Widget build(BuildContext context) {
    final center = state.userLocation ?? const LatLng(41.0082, 28.9784);

    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: 14,
        minZoom: 5,
        maxZoom: 18,
        onTap: (_, __) => onMapTap(),
      ),
      children: [
        TileLayer(
          urlTemplate:
              'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          subdomains: const ['a', 'b', 'c', 'd'],
          userAgentPackageName: 'com.yapgitsin.hizmet_app',
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
            // Pill markers need more width; height includes the tail
            final w = isSelected ? 88.0 : 76.0;
            final h = isSelected ? 46.0 : 38.0;
            final price = j.budgetMin != null
                ? j.budgetMin!.toStringAsFixed(0)
                : null;
            return Marker(
              point: LatLng(j.latitude!, j.longitude!),
              width: w,
              height: h,
              child: GestureDetector(
                onTap: () => onPinTap(j),
                child: JobMapMarker(
                  category: j.category,
                  isSelected: isSelected,
                  price: price,
                  isApprox: j.locationApprox,
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
      'Elektrikçi': '⚡',
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
// Airtasker-style bottom card
// ─────────────────────────────────────────────────────────────────────────────

class _AirtaskerCard extends StatelessWidget {
  final NearbyJob job;
  final VoidCallback onClose;

  const _AirtaskerCard({required this.job, required this.onClose});

  static IconData _iconFor(String category) {
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

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
              color: Color(0x28000000),
              blurRadius: 20,
              offset: Offset(0, -4)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFDDE3EC),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),

          // Main content row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon box with "Y" badge
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF4FF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      alignment: Alignment.center,
                      child: Icon(
                        _iconFor(job.category),
                        size: 32,
                        color: AppColors.primary,
                      ),
                    ),
                    // Y brand badge top-right
                    Positioned(
                      top: -4,
                      right: -4,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Y',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            height: 1,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(width: 14),

                // Job info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded,
                              size: 12, color: Colors.grey),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              '${job.location} · ${job.distanceKm.toStringAsFixed(1)} km',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Category chip
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          job.category,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Close button
                GestureDetector(
                  onTap: onClose,
                  child: const Padding(
                    padding: EdgeInsets.only(left: 8),
                    child: Icon(Icons.close_rounded,
                        size: 20, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Action buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                // Teklif Ver — primary, 60% width
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
                      elevation: 0,
                    ),
                    child: const Text(
                      'Teklif Ver',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Detay — outline, 35% width
                Expanded(
                  flex: 4,
                  child: OutlinedButton(
                    onPressed: () => context.push('/ilan/${job.id}'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Detay',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13)),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 14),
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
// Hata banner — kept as-is
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBanner({required this.message, required this.onRetry});

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
                    style: const TextStyle(fontSize: 11))),
            TextButton(
              onPressed: onRetry,
              child: const Text('Yenile',
                  style: TextStyle(fontSize: 11)),
            ),
          ],
        ),
      ),
    );
  }
}
