import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../../data/map_repository.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class MapState {
  final LatLng? userLocation;
  final List<NearbyJob> jobs;
  final String? selectedJobId;
  final String activeFilter;
  final bool showList;
  final bool locationLoading;
  final String? error;

  const MapState({
    this.userLocation,
    this.jobs = const [],
    this.selectedJobId,
    this.activeFilter = 'all',
    this.showList = false,
    this.locationLoading = true,
    this.error,
  });

  MapState copyWith({
    LatLng? userLocation,
    List<NearbyJob>? jobs,
    String? selectedJobId,
    bool clearSelectedJob = false,
    String? activeFilter,
    bool? showList,
    bool? locationLoading,
    String? error,
    bool clearError = false,
  }) =>
      MapState(
        userLocation: userLocation ?? this.userLocation,
        jobs: jobs ?? this.jobs,
        selectedJobId:
            clearSelectedJob ? null : (selectedJobId ?? this.selectedJobId),
        activeFilter: activeFilter ?? this.activeFilter,
        showList: showList ?? this.showList,
        locationLoading: locationLoading ?? this.locationLoading,
        error: clearError ? null : (error ?? this.error),
      );
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class MapNotifier extends StateNotifier<MapState> {
  final MapRepository _repo;
  Timer? _locationTimer;

  // Phase 152 — Backfill verisi (city-centroid) Türkiye geneline yayılıyor;
  // 20km'lik default kullanıcı görmüyor. Geniş tut, distanceKm zaten sıralıyor.
  static const double _defaultRadiusKm = 500.0;

  MapNotifier(this._repo) : super(const MapState());

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> init() async {
    if (state.userLocation != null) return; // zaten başlatılmış
    await _requestLocationAndLoad();
  }

  Future<void> _requestLocationAndLoad() async {
    state = state.copyWith(locationLoading: true, clearError: true);

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum izni reddedildi. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearbyJobs(istanbul);
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      final loc = LatLng(pos.latitude, pos.longitude);
      state = state.copyWith(userLocation: loc, locationLoading: false);
      await _loadNearbyJobs(loc);
      _startLocationTimer();
    } catch (_) {
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum alınamadı. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearbyJobs(istanbul);
    }
  }

  void _startLocationTimer() {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final loc = state.userLocation;
      if (loc == null) return;
      try {
        await _repo.updateLocation(lat: loc.latitude, lng: loc.longitude);
      } catch (e, st) {
        debugPrint('map_provider._startLocationTimer.updateLocation: $e\n$st');
      }
    });
  }

  Future<void> _loadNearbyJobs(LatLng loc) async {
    try {
      final category =
          state.activeFilter == 'all' ? null : state.activeFilter;
      final jobs = await _repo.getNearbyJobs(
        lat: loc.latitude,
        lng: loc.longitude,
        radiusKm: _defaultRadiusKm,
        category: category,
      );
      state = state.copyWith(jobs: jobs);
    } catch (_) {
      state = state.copyWith(error: 'İlanlar yüklenemedi. Tekrar deneyin.');
    }
  }

  void selectJob(String? jobId) => state = state.copyWith(
        selectedJobId: jobId,
        clearSelectedJob: jobId == null,
      );

  void setFilter(String filter) {
    state = state.copyWith(activeFilter: filter, clearSelectedJob: true);
    final loc = state.userLocation;
    if (loc != null) _loadNearbyJobs(loc);
  }

  void toggleView() => state = state.copyWith(showList: !state.showList);

  Future<void> refresh() async {
    final loc = state.userLocation;
    if (loc != null) await _loadNearbyJobs(loc);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final mapProvider = StateNotifierProvider<MapNotifier, MapState>((ref) {
  // Phase 152 — REST /jobs/nearby kullanılır. Eski Firebase repo ölü veri
  // (Firestore boş, gerçek backfill SQLite/NestJS tarafında).
  final repo = ref.watch(mapRepositoryProvider);
  return MapNotifier(repo);
});
