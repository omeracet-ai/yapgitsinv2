import 'package:flutter_riverpod/flutter_riverpod.dart';

enum JobSort { newest, budgetHigh, budgetLow }

class JobFilter {
  final double? budgetMin;
  final double? budgetMax;
  final JobSort sort;
  final bool featuredOnly;
  // Phase 297 — Mesafe filtresi. maxRadiusKm null ise filtre kapalı.
  // userLat/userLng map ekranıyla paylaşılır; haritada da aynı yarıçap çizilir.
  final double? maxRadiusKm;
  final double? userLat;
  final double? userLng;

  // Phase 300 — varsayılan mesafe (km). Açık/değişmemiş kabul edilir →
  // `activeCount`/`isEmpty` bu değeri "kullanıcı kişiselleştirmesi" saymaz.
  static const double defaultMaxRadiusKm = 20;

  const JobFilter({
    this.budgetMin,
    this.budgetMax,
    this.sort = JobSort.newest,
    this.featuredOnly = false,
    this.maxRadiusKm = defaultMaxRadiusKm,
    this.userLat,
    this.userLng,
  });

  /// Phase 307 — Mesafe filtresi default değerden farklıysa "özelleştirilmiş".
  /// Bu, filtre rozetinin (badge) Yapgitsin sekmesinde "takılı kalmasını"
  /// engeller: kullanıcı 20 km'yi değiştirmediği sürece chip nötr görünür.
  bool get isDistanceCustomized =>
      maxRadiusKm != defaultMaxRadiusKm;

  bool get isEmpty =>
      budgetMin == null &&
      budgetMax == null &&
      !featuredOnly &&
      sort == JobSort.newest &&
      !isDistanceCustomized;

  int get activeCount {
    var c = 0;
    if (budgetMin != null || budgetMax != null) c++;
    if (featuredOnly) c++;
    if (sort != JobSort.newest) c++;
    if (isDistanceCustomized) c++;
    return c;
  }

  JobFilter copyWith({
    double? budgetMin,
    double? budgetMax,
    JobSort? sort,
    bool? featuredOnly,
    double? maxRadiusKm,
    double? userLat,
    double? userLng,
    bool clearBudgetMin = false,
    bool clearBudgetMax = false,
    bool clearRadius = false,
  }) {
    return JobFilter(
      budgetMin: clearBudgetMin ? null : (budgetMin ?? this.budgetMin),
      budgetMax: clearBudgetMax ? null : (budgetMax ?? this.budgetMax),
      sort: sort ?? this.sort,
      featuredOnly: featuredOnly ?? this.featuredOnly,
      maxRadiusKm: clearRadius ? null : (maxRadiusKm ?? this.maxRadiusKm),
      userLat: clearRadius ? null : (userLat ?? this.userLat),
      userLng: clearRadius ? null : (userLng ?? this.userLng),
    );
  }
}

final jobFilterProvider =
    StateProvider<JobFilter>((ref) => const JobFilter());
