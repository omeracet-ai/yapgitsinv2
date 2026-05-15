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
  // Phase 178 — Yakındaki ustalar (mavi pin layer).
  final List<NearbyWorker> workers;
  final String? selectedJobId;
  final String? selectedWorkerId;
  final String activeFilter;
  final bool showList;
  final bool locationLoading;
  final String? error;

  const MapState({
    this.userLocation,
    this.jobs = const [],
    this.workers = const [],
    this.selectedJobId,
    this.selectedWorkerId,
    this.activeFilter = 'all',
    this.showList = false,
    this.locationLoading = true,
    this.error,
  });

  MapState copyWith({
    LatLng? userLocation,
    List<NearbyJob>? jobs,
    List<NearbyWorker>? workers,
    String? selectedJobId,
    bool clearSelectedJob = false,
    String? selectedWorkerId,
    bool clearSelectedWorker = false,
    String? activeFilter,
    bool? showList,
    bool? locationLoading,
    String? error,
    bool clearError = false,
  }) =>
      MapState(
        userLocation: userLocation ?? this.userLocation,
        jobs: jobs ?? this.jobs,
        workers: workers ?? this.workers,
        selectedJobId:
            clearSelectedJob ? null : (selectedJobId ?? this.selectedJobId),
        selectedWorkerId: clearSelectedWorker
            ? null
            : (selectedWorkerId ?? this.selectedWorkerId),
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
    // Phase 179 — Top-level guard. Web ortamında Geolocator.checkPermission()
    // secure context / browser policy nedeniyle throw edebilir; eskiden bu
    // uncaught microtask error olarak swallow ediliyor, /jobs/nearby ve
    // /users/workers/nearby hiç tetiklenmiyordu. Artık her durumda İstanbul
    // fallback ile veri yüklenir.
    try {
      await _requestLocationAndLoad();
    } catch (e, st) {
      debugPrint('map_provider.init fatal: $e\n$st');
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum servisi açılamadı. İstanbul merkezi gösteriliyor.',
      );
      try {
        await _loadNearby(istanbul);
      } catch (e2, st2) {
        debugPrint('map_provider.init fallback _loadNearby: $e2\n$st2');
      }
    }
  }

  Future<void> _requestLocationAndLoad() async {
    state = state.copyWith(locationLoading: true, clearError: true);

    // Phase 179 — Permission API'leri web'de throw edebilir; ayrı try ile sar
    // ve fail durumunda İstanbul fallback'e geç. Eskiden bu exception tüm
    // init zincirini kırıyor, hiç nearby endpoint'i çağrılmıyordu.
    LocationPermission permission = LocationPermission.denied;
    try {
      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
    } catch (e, st) {
      debugPrint('map_provider permission check failed: $e\n$st');
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum izni alınamadı. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearby(istanbul);
      return;
    }

    if (permission == LocationPermission.deniedForever ||
        permission == LocationPermission.denied) {
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum izni reddedildi. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearby(istanbul);
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      // Phase 179 — Null island guard. Web playground / emulator bazen
      // (0,0) döndürüyor; bu Atlantik ortası → 0 sonuç. İstanbul'a düş.
      final isNullIsland = pos.latitude.abs() < 0.01 && pos.longitude.abs() < 0.01;
      if (isNullIsland) {
        const istanbul = LatLng(41.0082, 28.9784);
        state = state.copyWith(
          userLocation: istanbul,
          locationLoading: false,
          error: 'Konum (0,0) algılandı. İstanbul merkezi gösteriliyor.',
        );
        await _loadNearby(istanbul);
        return;
      }
      final loc = LatLng(pos.latitude, pos.longitude);
      state = state.copyWith(userLocation: loc, locationLoading: false);
      await _loadNearby(loc);
      _startLocationTimer();
    } catch (e, st) {
      debugPrint('map_provider getCurrentPosition failed: $e\n$st');
      const istanbul = LatLng(41.0082, 28.9784);
      state = state.copyWith(
        userLocation: istanbul,
        locationLoading: false,
        error: 'Konum alınamadı. İstanbul merkezi gösteriliyor.',
      );
      await _loadNearby(istanbul);
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

  Future<void> _loadNearby(LatLng loc) async {
    final category = state.activeFilter == 'all' ? null : state.activeFilter;
    // Phase 178 — jobs ve workers paralel çek. Biri başarısız olsa diğeri
    // gösterilebilsin diye `Future.wait` yerine ayrı try/catch.
    final jobsFuture = _repo
        .getNearbyJobs(
          lat: loc.latitude,
          lng: loc.longitude,
          radiusKm: _defaultRadiusKm,
          category: category,
        )
        .then<List<NearbyJob>?>((v) => v)
        .catchError((Object e, StackTrace st) {
      // Phase 179 — Silent catch'i kaldır: error console'a düşür, fallback null.
      debugPrint('map_provider.getNearbyJobs failed: $e\n$st');
      return null;
    });
    final workersFuture = _repo
        .getNearbyWorkers(
          lat: loc.latitude,
          lon: loc.longitude,
          radiusKm: _defaultRadiusKm,
          category: category,
          limit: 100,
        )
        .then<List<NearbyWorker>?>((v) => v)
        .catchError((Object e, StackTrace st) {
      debugPrint('map_provider.getNearbyWorkers failed: $e\n$st');
      return null;
    });
    final results = await Future.wait([jobsFuture, workersFuture]);
    final jobs = results[0] as List<NearbyJob>?;
    final workers = results[1] as List<NearbyWorker>?;
    if (jobs == null && workers == null) {
      state = state.copyWith(error: 'Veriler yüklenemedi. Tekrar deneyin.');
      return;
    }
    state = state.copyWith(
      jobs: jobs ?? state.jobs,
      workers: workers ?? state.workers,
      clearError: true,
    );
  }

  void selectJob(String? jobId) => state = state.copyWith(
        selectedJobId: jobId,
        clearSelectedJob: jobId == null,
        clearSelectedWorker: true,
      );

  void selectWorker(String? workerId) => state = state.copyWith(
        selectedWorkerId: workerId,
        clearSelectedWorker: workerId == null,
        clearSelectedJob: true,
      );

  void setFilter(String filter) {
    state = state.copyWith(
      activeFilter: filter,
      clearSelectedJob: true,
      clearSelectedWorker: true,
    );
    final loc = state.userLocation;
    if (loc != null) _loadNearby(loc);
  }

  void toggleView() => state = state.copyWith(showList: !state.showList);

  Future<void> refresh() async {
    final loc = state.userLocation;
    if (loc != null) await _loadNearby(loc);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final mapProvider = StateNotifierProvider<MapNotifier, MapState>((ref) {
  // Phase 152 — REST /jobs/nearby kullanılır. Eski Firebase repo ölü veri
  // (Firestore boş, gerçek backfill SQLite/NestJS tarafında).
  final repo = ref.watch(mapRepositoryProvider);
  return MapNotifier(repo);
});
