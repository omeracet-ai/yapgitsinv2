import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class JobDraft {
  final String? title;
  final String? description;
  final String? category;
  final String? categoryId;
  final String? location;
  final double? budgetMin;
  final double? budgetMax;
  final String? dueDate; // ISO yyyy-MM-dd
  final List<String> photos;
  final List<String> videos;
  final double? latitude;
  final double? longitude;
  final int savedAt; // epoch ms

  const JobDraft({
    this.title,
    this.description,
    this.category,
    this.categoryId,
    this.location,
    this.budgetMin,
    this.budgetMax,
    this.dueDate,
    this.photos = const [],
    this.videos = const [],
    this.latitude,
    this.longitude,
    required this.savedAt,
  });

  bool get isEmpty =>
      (title == null || title!.isEmpty) &&
      (description == null || description!.isEmpty) &&
      (category == null || category!.isEmpty) &&
      (location == null || location!.isEmpty) &&
      photos.isEmpty &&
      videos.isEmpty &&
      budgetMin == null &&
      dueDate == null;

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'category': category,
        'categoryId': categoryId,
        'location': location,
        'budgetMin': budgetMin,
        'budgetMax': budgetMax,
        'dueDate': dueDate,
        'photos': photos,
        'videos': videos,
        'latitude': latitude,
        'longitude': longitude,
        'savedAt': savedAt,
      };

  factory JobDraft.fromJson(Map<String, dynamic> j) => JobDraft(
        title: j['title'] as String?,
        description: j['description'] as String?,
        category: j['category'] as String?,
        categoryId: j['categoryId'] as String?,
        location: j['location'] as String?,
        budgetMin: (j['budgetMin'] as num?)?.toDouble(),
        budgetMax: (j['budgetMax'] as num?)?.toDouble(),
        dueDate: j['dueDate'] as String?,
        photos: (j['photos'] as List?)?.cast<String>() ?? const [],
        videos: (j['videos'] as List?)?.cast<String>() ?? const [],
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        savedAt: (j['savedAt'] as num?)?.toInt() ??
            DateTime.now().millisecondsSinceEpoch,
      );
}

class JobDraftStorage {
  static const _key = 'job_draft';

  Future<void> save(JobDraft draft) async {
    if (draft.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(draft.toJson()));
  }

  Future<JobDraft?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return JobDraft.fromJson(map);
    } catch (_) {
      await prefs.remove(_key);
      return null;
    }
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
