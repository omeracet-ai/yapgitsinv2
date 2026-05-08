import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'worker_filter.dart';

/// Phase 57 — Recent Searches History
///
/// Provider list / worker discovery için son 5 arama kombinasyonu.
/// SharedPreferences key: `recent_worker_searches` (JSON array).
class RecentSearch {
  final String? category;
  final String? city;
  final double? minRating;
  final WorkerSortBy sortBy;
  final DateTime savedAt;

  const RecentSearch({
    this.category,
    this.city,
    this.minRating,
    this.sortBy = WorkerSortBy.reputation,
    required this.savedAt,
  });

  /// Filtre özetini chip için string olarak döner.
  String get summary {
    final parts = <String>[];
    if (category != null && category!.isNotEmpty) parts.add(category!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    if (minRating != null) parts.add('⭐${minRating!.toStringAsFixed(1)}+');
    if (parts.isEmpty) parts.add('Tüm Ustalar');
    return parts.join(' · ');
  }

  /// Dedup için anahtar (savedAt hariç).
  String get dedupKey =>
      '${category ?? ''}|${city ?? ''}|${minRating ?? ''}|${sortBy.apiValue}';

  Map<String, dynamic> toJson() => {
        'category': category,
        'city': city,
        'minRating': minRating,
        'sortBy': sortBy.apiValue,
        'savedAt': savedAt.toIso8601String(),
      };

  static RecentSearch fromJson(Map<String, dynamic> j) {
    final sortStr = (j['sortBy'] as String?) ?? 'reputation';
    final sort = WorkerSortBy.values.firstWhere(
      (s) => s.apiValue == sortStr,
      orElse: () => WorkerSortBy.reputation,
    );
    return RecentSearch(
      category: j['category'] as String?,
      city: j['city'] as String?,
      minRating: (j['minRating'] as num?)?.toDouble(),
      sortBy: sort,
      savedAt: DateTime.tryParse(j['savedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}

class RecentSearchesStorage {
  static const _key = 'recent_worker_searches';
  static const _maxItems = 5;

  static Future<List<RecentSearch>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => RecentSearch.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Yeni arama ekler. Aynı kombo varsa üste taşınır, max 5 tutulur.
  static Future<List<RecentSearch>> add(RecentSearch search) async {
    final current = await load();
    final dedupKey = search.dedupKey;
    current.removeWhere((s) => s.dedupKey == dedupKey);
    current.insert(0, search);
    final trimmed =
        current.length > _maxItems ? current.sublist(0, _maxItems) : current;
    await _save(trimmed);
    return trimmed;
  }

  static Future<List<RecentSearch>> remove(String dedupKey) async {
    final current = await load();
    current.removeWhere((s) => s.dedupKey == dedupKey);
    await _save(current);
    return current;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  static Future<void> _save(List<RecentSearch> items) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(items.map((s) => s.toJson()).toList());
    await prefs.setString(_key, encoded);
  }
}
