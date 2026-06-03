import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/map_repository.dart';
import 'worker_map_marker.dart';

/// Phase 386 — İlan başarılı sonrası "Hızlı Hizmet Verenlere Ulaş" CTA'sından
/// açılan odaklı bottom sheet. Yalnızca seçili kategoriyle eşleşen ustaları
/// haritada gösterir. Ekranın %85'ini kaplar; alt %15 önceki içeriği görünür
/// bırakır.
class WorkersNearbySheet extends ConsumerStatefulWidget {
  final String category;
  const WorkersNearbySheet({super.key, required this.category});

  /// %85 yüksekliğinde slide-up panel. Default modal bottom sheet'in 250ms
  /// micro-slide'ı yerine 380ms easeOutCubic ile belirgin "aşağıdan yukarı"
  /// sayfa hissi verir; arka plan koyu barrier.
  static Future<void> show(BuildContext context, String category) {
    return Navigator.of(context).push(
      PageRouteBuilder<void>(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 380),
        reverseTransitionDuration: const Duration(milliseconds: 260),
        pageBuilder: (_, __, ___) => GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {},
          child: Align(
            alignment: Alignment.bottomCenter,
            child: FractionallySizedBox(
              heightFactor: 0.85,
              child: WorkersNearbySheet(category: category),
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
  }

  @override
  ConsumerState<WorkersNearbySheet> createState() => _WorkersNearbySheetState();
}

class _WorkersNearbySheetState extends ConsumerState<WorkersNearbySheet> {
  final _mapController = MapController();
  LatLng _center = const LatLng(41.0082, 28.9784); // İstanbul fallback
  bool _loading = true;
  String? _error;
  List<NearbyWorker> _workers = const [];
  String? _selectedWorkerId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      // 1) GPS — izin alınamazsa varsayılan merkeze düş.
      final pos = await _tryGetLocation();
      if (pos != null) {
        _center = LatLng(pos.latitude, pos.longitude);
      }
      // 2) Yakındaki ustaları kategoriye göre çek.
      final repo = ref.read(mapRepositoryProvider);
      final list = await repo.getNearbyWorkers(
        lat: _center.latitude,
        lon: _center.longitude,
        category: widget.category,
        radiusKm: 50,
      );
      if (!mounted) return;
      setState(() {
        _workers = list;
        _loading = false;
      });
      // 3) İlk fit: tüm pin'leri + kullanıcı konumunu kapsa.
      _fitToWorkers();
    } catch (e, st) {
      debugPrint('workers_nearby_sheet bootstrap: $e\n$st');
      if (!mounted) return;
      setState(() {
        _error = 'Ustalar yüklenemedi.';
        _loading = false;
      });
    }
  }

  Future<Position?> _tryGetLocation() async {
    try {
      final serviceOn = await Geolocator.isLocationServiceEnabled();
      if (!serviceOn) return null;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );
    } catch (_) {
      return null;
    }
  }

  void _fitToWorkers() {
    final pts = <LatLng>[
      _center,
      for (final w in _workers)
        if (w.latitude != null && w.longitude != null)
          LatLng(w.latitude!, w.longitude!),
    ];
    if (pts.length < 2) {
      _mapController.move(_center, 12);
      return;
    }
    double minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (final p in pts) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: LatLngBounds(LatLng(minLat, minLng), LatLng(maxLat, maxLng)),
        padding: const EdgeInsets.all(56),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _header(),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _header() {
    final selected = _selectedWorkerId != null
        ? _workers.firstWhere(
            (w) => w.id == _selectedWorkerId,
            orElse: () => _workers.first,
          )
        : null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.bolt, color: AppColors.success),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      selected != null
                          ? (selected.name ?? 'Usta')
                          : 'Hızlı Hizmet Verenler',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      selected != null
                          ? '${widget.category} • ${selected.distanceKm.toStringAsFixed(1)} km'
                          : '${widget.category} • ${_workers.length} usta',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                color: AppColors.textSecondary,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_error!, style: const TextStyle(color: AppColors.error)),
        ),
      );
    }
    if (_workers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.person_off, size: 48, color: AppColors.textHint),
              const SizedBox(height: 12),
              Text(
                'Bu kategori için yakınınızda usta bulunamadı.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _center,
            initialZoom: 12,
            onTap: (_, __) => setState(() => _selectedWorkerId = null),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.hizmetapp.app',
            ),
            // Kullanıcı konum noktası
            MarkerLayer(
              markers: [
                Marker(
                  point: _center,
                  width: 18,
                  height: 18,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            // Usta pin'leri
            MarkerLayer(
              markers: [
                for (final w in _workers)
                  if (w.latitude != null && w.longitude != null)
                    Marker(
                      point: LatLng(w.latitude!, w.longitude!),
                      width: 80,
                      height: 56,
                      alignment: Alignment.topCenter,
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _selectedWorkerId = w.id),
                        child: WorkerMapMarker(
                          name: w.name,
                          rating: w.rating,
                          isSelected: w.id == _selectedWorkerId,
                          isVerified: w.identityVerified,
                          isApprox: w.locationApprox,
                        ),
                      ),
                    ),
              ],
            ),
          ],
        ),
        if (_selectedWorkerId != null) _selectedWorkerCard(),
      ],
    );
  }

  Widget _selectedWorkerCard() {
    final w = _workers.firstWhere(
      (x) => x.id == _selectedWorkerId,
      orElse: () => _workers.first,
    );
    return Positioned(
      left: 12,
      right: 12,
      bottom: 16,
      child: Material(
        color: AppColors.surface,
        elevation: 6,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.of(context).pop();
            context.push('/usta/${w.id}');
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  backgroundImage: (w.avatarUrl?.isNotEmpty ?? false)
                      ? NetworkImage(w.avatarUrl!)
                      : null,
                  child: (w.avatarUrl?.isEmpty ?? true)
                      ? const Icon(Icons.person, color: AppColors.primary)
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              w.name ?? 'Usta',
                              style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (w.identityVerified) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified,
                                size: 14, color: AppColors.verifiedBlue),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${w.distanceKm.toStringAsFixed(1)} km'
                        '${w.rating != null ? ' • ⭐ ${w.rating!.toStringAsFixed(1)}' : ''}',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
