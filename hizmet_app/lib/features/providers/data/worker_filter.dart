/// Worker dizini için filtre durumu — Phase 39
///
/// Backend kontratı (/users/workers query params):
///   minRating, minRate, maxRate, verifiedOnly, availableOnly, sortBy
enum WorkerSortBy {
  reputation,
  rating,
  rateAsc,
  rateDesc,
}

extension WorkerSortByX on WorkerSortBy {
  String get apiValue {
    switch (this) {
      case WorkerSortBy.reputation:
        return 'reputation';
      case WorkerSortBy.rating:
        return 'rating';
      case WorkerSortBy.rateAsc:
        return 'rate_asc';
      case WorkerSortBy.rateDesc:
        return 'rate_desc';
    }
  }

  String get label {
    switch (this) {
      case WorkerSortBy.reputation:
        return 'En İtibarlı';
      case WorkerSortBy.rating:
        return 'En Yüksek Puan';
      case WorkerSortBy.rateAsc:
        return 'Ücret: Düşükten Yükseğe';
      case WorkerSortBy.rateDesc:
        return 'Ücret: Yüksekten Düşüğe';
    }
  }
}

class WorkerFilter {
  final double? minRating;
  final double? minRate;
  final double? maxRate;
  final bool verifiedOnly;
  final bool availableOnly;
  final WorkerSortBy sortBy;

  const WorkerFilter({
    this.minRating,
    this.minRate,
    this.maxRate,
    this.verifiedOnly = false,
    this.availableOnly = false,
    this.sortBy = WorkerSortBy.reputation,
  });

  static const empty = WorkerFilter();

  WorkerFilter copyWith({
    double? minRating,
    double? minRate,
    double? maxRate,
    bool? verifiedOnly,
    bool? availableOnly,
    WorkerSortBy? sortBy,
    bool clearMinRating = false,
    bool clearMinRate = false,
    bool clearMaxRate = false,
  }) {
    return WorkerFilter(
      minRating: clearMinRating ? null : (minRating ?? this.minRating),
      minRate: clearMinRate ? null : (minRate ?? this.minRate),
      maxRate: clearMaxRate ? null : (maxRate ?? this.maxRate),
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      availableOnly: availableOnly ?? this.availableOnly,
      sortBy: sortBy ?? this.sortBy,
    );
  }

  /// API query parametreleri — null ve default değerler atlanır.
  Map<String, dynamic> toQueryMap() {
    final m = <String, dynamic>{};
    if (minRating != null) m['minRating'] = minRating;
    if (minRate != null) m['minRate'] = minRate;
    if (maxRate != null) m['maxRate'] = maxRate;
    if (verifiedOnly) m['verifiedOnly'] = true;
    if (availableOnly) m['availableOnly'] = true;
    if (sortBy != WorkerSortBy.reputation) m['sortBy'] = sortBy.apiValue;
    return m;
  }

  /// UI: kaç filtre aktif (sortBy default'ı sayılmaz, sadece varsayılan dışı)
  int get activeCount {
    int n = 0;
    if (minRating != null) n++;
    if (minRate != null || maxRate != null) n++;
    if (verifiedOnly) n++;
    if (availableOnly) n++;
    if (sortBy != WorkerSortBy.reputation) n++;
    return n;
  }

  bool get isEmpty => activeCount == 0;
}
