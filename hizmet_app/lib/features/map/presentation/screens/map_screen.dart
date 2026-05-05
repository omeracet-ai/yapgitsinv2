import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import '../../../../../core/theme/app_colors.dart';
import '../providers/map_provider.dart';
import '../../data/map_repository.dart';

const _kOrangePin = Color(0xFFFFA000);
const _kBluePin = Color(0xFF007DFE);

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
      body: Column(
        children: [
          _AppBarSection(state: state, notifier: notifier),
          Expanded(
            child: state.showList
                ? _JobListView(
                    jobs: state.jobs,
                    onTap: (j) => notifier.selectJob(j.id),
                  )
                : Stack(
                    children: [
                      _MapView(
                        state: state,
                        mapController: _mapController,
                        onPinTap: (j) => notifier.selectJob(j.id),
                        onMapTap: () => notifier.selectJob(null),
                      ),
                      if (state.locationLoading)
                        const Center(child: CircularProgressIndicator()),
                      if (state.error != null)
                        _ErrorBanner(
                          message: state.error!,
                          onRetry: notifier.refresh,
                        ),
                      if (!state.locationLoading && state.jobs.isNotEmpty)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: const [
                                BoxShadow(color: Colors.black12, blurRadius: 4)
                              ],
                            ),
                            child: Text(
                              '${state.jobs.length} ilan',
                              style: const TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      if (state.userLocation != null)
                        Positioned(
                          bottom: selectedJob != null ? 120 : 16,
                          right: 16,
                          child: FloatingActionButton.small(
                            heroTag: 'locate',
                            backgroundColor: Colors.white,
                            onPressed: () =>
                                _mapController.move(state.userLocation!, 15),
                            child: const Icon(Icons.my_location,
                                color: AppColors.primary),
                          ),
                        ),
                    ],
                  ),
          ),
          if (selectedJob != null && !state.showList)
            _MiniCard(
              job: selectedJob,
              onClose: () => notifier.selectJob(null),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AppBar + toggle + kategori chips
// ─────────────────────────────────────────────────────────────────────────────

class _AppBarSection extends StatelessWidget {
  final MapState state;
  final MapNotifier notifier;

  const _AppBarSection({required this.state, required this.notifier});

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
    return Container(
      color: AppColors.primary,
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.search, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text('Yakınımdaki ilanlar',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _ToggleBtn(
                          label: '🗺 Harita',
                          active: !state.showList,
                          onTap: () {
                            if (state.showList) notifier.toggleView();
                          },
                        ),
                        _ToggleBtn(
                          label: '☰ Liste',
                          active: state.showList,
                          onTap: () {
                            if (!state.showList) notifier.toggleView();
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: _categories.map((cat) {
                  final isActive = state.activeFilter == cat;
                  final label = cat == 'all' ? 'Tümü' : cat;
                  return GestureDetector(
                    onTap: () => notifier.setFilter(cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(right: 8, bottom: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: isActive
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isActive ? AppColors.primary : Colors.white,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ToggleBtn(
      {required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: active
                ? AppColors.primary
                : Colors.white.withValues(alpha: 0.8),
          ),
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
        onTap: (_, __) => onMapTap(),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
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
            final size = isSelected ? 30.0 : 24.0;
            return Marker(
              point: LatLng(j.latitude!, j.longitude!),
              width: size,
              height: size,
              child: GestureDetector(
                onTap: () => onPinTap(j),
                child: _DropPin(
                  color: isSelected ? _kBluePin : _kOrangePin,
                  size: size,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _DropPin extends StatelessWidget {
  final Color color;
  final double size;

  const _DropPin({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.785,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(100),
            topRight: Radius.circular(100),
            bottomRight: Radius.circular(100),
          ),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.4),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste görünümü
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
// Mini kart
// ─────────────────────────────────────────────────────────────────────────────

class _MiniCard extends StatelessWidget {
  final NearbyJob job;
  final VoidCallback onClose;

  const _MiniCard({required this.job, required this.onClose});

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
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        boxShadow: [
          BoxShadow(
              color: Colors.black12,
              blurRadius: 8,
              offset: Offset(0, -2))
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(_icon(job.category),
                style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  job.title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${job.location} · ${job.distanceKm.toStringAsFixed(1)} km uzakta',
                  style:
                      const TextStyle(fontSize: 11, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3E0),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    job.category,
                    style: const TextStyle(
                        fontSize: 9,
                        color: _kOrangePin,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ElevatedButton(
                onPressed: () => context.push('/jobs/${job.id}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Teklif Ver',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: onClose,
                child: const Icon(Icons.close,
                    size: 18, color: Colors.grey),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hata banner
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
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        color: Colors.amber.shade100,
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                size: 16, color: Colors.orange),
            const SizedBox(width: 8),
            Expanded(
                child:
                    Text(message, style: const TextStyle(fontSize: 11))),
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
