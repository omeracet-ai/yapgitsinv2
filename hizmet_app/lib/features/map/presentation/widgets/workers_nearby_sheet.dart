import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/card_3d.dart';
import '../../../../core/utils/motion.dart';
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
    // Phase 391 — reduce-motion: slide süresini sıfırla, doğrudan görünür.
    final reduced = Motion.reduced(context);
    return Navigator.of(context).push(
      PageRouteBuilder<void>(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black54,
        transitionDuration:
            reduced ? Duration.zero : const Duration(milliseconds: 380),
        reverseTransitionDuration:
            reduced ? Duration.zero : const Duration(milliseconds: 260),
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
          if (reduced) return child;
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
    // Phase 388 — Yapgitsin 3D pattern (Phase 369): dark vertical gradient,
    // üst kenarda hafif highlight, yukarı yönelik koyu boxShadow ("kalkık"
    // sayfa hissi). Köşeler 22px (Yapgitsin sheet standardı).
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
          children: [
            _header(),
            Expanded(child: _body()),
          ],
        ),
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
          // Drag handle — Yapgitsin standardı (Phase 369): 44×4 beyaz alpha 0.18.
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
          const SizedBox(height: 12),
          Row(
            children: [
              // Şimşek ikonu yumuşak yeşil halo ile (3D hissi).
              // Phase 391 — nabız animasyonu sadece reduce-motion KAPALI iken.
              _PulsingBolt(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      selected != null
                          ? (selected.name ?? 'Usta')
                          : 'Hızlı Hizmet Verenler',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                          color: Colors.white),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                AppColors.primary.withValues(alpha: 0.22),
                                AppColors.primary.withValues(alpha: 0.08),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: AppColors.primary
                                    .withValues(alpha: 0.30),
                                width: 0.6),
                          ),
                          child: Text(
                            selected != null
                                ? '${selected.distanceKm.toStringAsFixed(1)} km'
                                : '${_workers.length} usta',
                            style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary
                                    .withValues(alpha: 0.95)),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            widget.category,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 12,
                                color:
                                    Colors.white.withValues(alpha: 0.65)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                color: Colors.white.withValues(alpha: 0.75),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _body() {
    // Phase 389 — Büyük "usta bulunamadı / yükleniyor / hata" ekranları
    // kaldırıldı. Her durumda doğrudan harita render edilir; durum bilgisi
    // sağ üstte küçük chip ile gösterilir.
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
        // Sağ üst durum chip'i: yükleniyor / boş / hata. Pin yoksa veya
        // istek devam ediyorsa kullanıcıyı kısa bir overlay ile bilgilendir.
        if (_loading || _error != null || _workers.isEmpty) _statusChip(),
      ],
    );
  }

  Widget _statusChip() {
    String label;
    IconData icon;
    Color color;
    if (_loading) {
      label = 'Yükleniyor…';
      icon = Icons.hourglass_top_rounded;
      color = AppColors.primary;
    } else if (_error != null) {
      label = 'Bağlantı hatası';
      icon = Icons.cloud_off_rounded;
      color = AppColors.error;
    } else {
      label = '0 usta';
      icon = Icons.search_off_rounded;
      color = AppColors.textHint;
    }
    return Positioned(
      top: 10,
      right: 10,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: color.withValues(alpha: 0.40), width: 0.6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_loading)
              SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                  strokeWidth: 1.8,
                  color: color,
                ),
              )
            else
              Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withValues(alpha: 0.92)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _selectedWorkerCard() {
    final w = _workers.firstWhere(
      (x) => x.id == _selectedWorkerId,
      orElse: () => _workers.first,
    );
    // Phase 388 — Card3D ile Yapgitsin gradient + iç highlight + dual shadow.
    // Slide+fade entrance (220ms), her seçim değişimde key ile rebuild → re-anime.
    // Phase 391 — reduce-motion'da entrance animasyonu atla, kart hemen görünür.
    final Widget card = Card3D(
        radius: 16,
        elevation: 1.6,
        onTap: () {
          Navigator.of(context).pop();
          context.push('/usta/${w.id}');
        },
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.30),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary.withValues(alpha: 0.18),
                backgroundImage: (w.avatarUrl?.isNotEmpty ?? false)
                    ? NetworkImage(w.avatarUrl!)
                    : null,
                child: (w.avatarUrl?.isEmpty ?? true)
                    ? const Icon(Icons.person, color: AppColors.primary)
                    : null,
              ),
            ),
            const SizedBox(width: 12),
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
                          style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.1,
                              color: Colors.white),
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
                  Row(
                    children: [
                      Icon(Icons.place_outlined,
                          size: 12,
                          color: Colors.white.withValues(alpha: 0.55)),
                      const SizedBox(width: 2),
                      Text(
                        '${w.distanceKm.toStringAsFixed(1)} km',
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.65)),
                      ),
                      if (w.rating != null) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.star_rounded,
                            size: 13, color: AppColors.accentYellow),
                        const SizedBox(width: 2),
                        Text(
                          w.rating!.toStringAsFixed(1),
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color:
                                  Colors.white.withValues(alpha: 0.85)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary,
                    AppColors.primary.withValues(alpha: 0.75),
                  ],
                ),
              ),
              child: const Icon(Icons.arrow_forward_rounded,
                  size: 16, color: Colors.white),
            ),
          ],
        ),
      );
    final animated = Motion.reduced(context)
        ? card
        : card.animate().slideY(
            begin: 0.4,
            end: 0.0,
            duration: 280.ms,
            curve: Curves.easeOutCubic).fadeIn(duration: 220.ms);
    return Positioned(
      key: ValueKey('worker_card_${w.id}'),
      left: 12,
      right: 12,
      bottom: 16,
      child: animated,
    );
  }
}

/// Phase 391 — Şimşek ikonu (yeşil halo + nabız). Reduce-motion'da statik kalır.
class _PulsingBolt extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final core = Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.success.withValues(alpha: 0.32),
            AppColors.success.withValues(alpha: 0.08),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.success.withValues(alpha: 0.30),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Icon(Icons.bolt, color: AppColors.success, size: 20),
    );
    if (Motion.reduced(context)) return core;
    return core.animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(
        duration: 1400.ms,
        begin: 1.0,
        end: 1.06,
        curve: Curves.easeInOut);
  }
}
