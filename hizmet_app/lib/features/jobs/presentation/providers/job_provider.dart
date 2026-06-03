import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/job_filter.dart';
import '../../data/job_repository.dart';
import '../../../../core/services/intl_formatter.dart';

class JobStatus {
  // ignore: constant_identifier_names
  static const String OPEN      = 'open';
  // ignore: constant_identifier_names
  static const String CLOSED    = 'closed';
  // ignore: constant_identifier_names
  static const String COMPLETED = 'completed';
  // ignore: constant_identifier_names
  static const String CANCELLED = 'cancelled';
}

/// Phase Two-Sided — ilan türü ayraç (backend ile aynı string'ler)
class JobKind {
  static const String request = 'request'; // müşteri talep
  static const String offer = 'offer';     // usta hizmet ilanı
}

/// İlan sahibinin liste kartında gösterilen kompakt profili (backend `poster`).
class JobPoster {
  final String id;
  final String fullName;
  final String? profileImageUrl;
  final double averageRating;
  final int totalReviews;
  final int reputationScore;
  final int asWorkerTotal;
  final int asWorkerSuccess;
  final bool identityVerified;

  const JobPoster({
    required this.id,
    this.fullName = '',
    this.profileImageUrl,
    this.averageRating = 0,
    this.totalReviews = 0,
    this.reputationScore = 0,
    this.asWorkerTotal = 0,
    this.asWorkerSuccess = 0,
    this.identityVerified = false,
  });

  /// Başarı oranı yüzdesi (0-100). Hiç tamamlanmış iş yoksa null.
  int? get successRate =>
      asWorkerTotal > 0 ? ((asWorkerSuccess / asWorkerTotal) * 100).round() : null;

  /// Gösterilecek itibar/derece puanı. Backend reputationScore > 0 ise onu
  /// kullan; değilse mevcut sinyallerden türet (rating×20 + başarı×5) — seed/
  /// eski veride reputationScore 0 kalabildiği için aktif ustaların "0 · Yeni"
  /// görünmesini önler. (Formül CLAUDE.md reputationScore ile aynı mantıkta.)
  int get effectiveScore {
    if (reputationScore > 0) return reputationScore;
    return (averageRating * 20).round() + asWorkerSuccess * 5;
  }

  /// effectiveScore → kısa seviye etiketi (sayı + etiket birlikte gösterilir).
  String get levelLabel {
    final r = effectiveScore;
    if (r >= 140) return 'Pro';
    if (r >= 100) return 'Uzman';
    if (r >= 50) return 'Tecrübeli';
    return 'Yeni';
  }

  static JobPoster? fromMap(dynamic m) {
    if (m is! Map) return null;
    final id = m['id']?.toString();
    if (id == null || id.isEmpty) return null;
    num? asNum(dynamic v) =>
        v is num ? v : num.tryParse(v?.toString() ?? '');
    final img = m['profileImageUrl'];
    return JobPoster(
      id: id,
      fullName: (m['fullName'] ?? '').toString(),
      profileImageUrl:
          img is String && img.isNotEmpty ? img : null,
      averageRating: (asNum(m['averageRating']) ?? 0).toDouble(),
      totalReviews: (asNum(m['totalReviews']) ?? 0).toInt(),
      reputationScore: (asNum(m['reputationScore']) ?? 0).toInt(),
      asWorkerTotal: (asNum(m['asWorkerTotal']) ?? 0).toInt(),
      asWorkerSuccess: (asNum(m['asWorkerSuccess']) ?? 0).toInt(),
      identityVerified: m['identityVerified'] == true,
    );
  }
}

class Job {
  final String id, title, desc, location, budget, time;
  final IconData icon;
  final Color color;
  final String category;
  final bool isFeatured;
  final String? customerId;

  // Raw API fields
  final String? status;
  final double? budgetMin;
  final double? budgetMax;
  final String? createdAt;
  final String? description;
  final List<String>? photos;
  final int? featuredOrder;
  final String kind; // 'request' | 'offer'
  final JobPoster? poster; // ilan sahibinin kompakt profili (liste kartı)
  /// Phase 265e — listeden gelen public root-only offer sayısı.
  /// Logout user da bu sayıyı görür; per-card /offers fetch gerekmez.
  final int offerCount;
  // Phase 296 — due date / time / schedule flexibility (Yapgitsin tab card UI).
  final String? dueDate; // YYYY-MM-DD
  final String? dueTime; // HH:MM
  final bool dueAnyTime;
  final String? scheduleFlexibility; // 'flexible' | 'specific' | 'urgent'

  Job({
    required this.id,
    required this.title,
    required this.desc,
    required this.location,
    required this.budget,
    required this.time,
    required this.icon,
    required this.color,
    required this.category,
    this.isFeatured = false,
    this.customerId,
    this.status,
    this.budgetMin,
    this.budgetMax,
    this.createdAt,
    this.description,
    this.photos,
    this.featuredOrder,
    this.kind = JobKind.request,
    this.poster,
    this.offerCount = 0,
    this.dueDate,
    this.dueTime,
    this.dueAnyTime = true,
    this.scheduleFlexibility,
  });

  /// Phase 387 — JobHistoryDialog gibi Map-tabanlı tüketicilere ham veri
  /// vermek için. fromMap'in tersi; sadece dialogların okuduğu anahtarları
  /// içerir.
  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'description': description ?? desc,
        'category': category,
        'location': location,
        'status': status,
        'budgetMin': budgetMin,
        'budgetMax': budgetMax,
        'createdAt': createdAt,
        'dueDate': dueDate,
        'dueTime': dueTime,
        'dueAnyTime': dueAnyTime,
        'scheduleFlexibility': scheduleFlexibility,
        'photos': photos,
        'featuredOrder': featuredOrder,
        'customerId': customerId,
        'kind': kind,
      };

  factory Job.fromMap(Map<String, dynamic> map) {
    final bMin = (map['budgetMin'] as num?)?.toDouble();
    final bMax = (map['budgetMax'] as num?)?.toDouble();
    // Phase 294 — TL noktalama: 1.500 – 3.000 ₺
    final budgetStr = IntlFormatter.tlRange(bMin, bMax);

    final rawPhotos = map['photos'];
    final photoList = rawPhotos is List
        ? rawPhotos.map((e) => e.toString()).toList()
        : <String>[];

    return Job(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      desc: map['description'] ?? '',
      location: map['location'] ?? '',
      budget: budgetStr,
      time: _timeAgo(map['createdAt'] as String?),
      category: map['category'] ?? '',
      icon: getIconForCategory(map['category']),
      color: getColorForCategory(map['category']),
      isFeatured: map['featuredOrder'] != null,
      customerId: map['customerId'] as String?,
      // Raw fields
      status: map['status'] as String?,
      budgetMin: bMin,
      budgetMax: bMax,
      createdAt: map['createdAt'] as String?,
      description: map['description'] as String?,
      photos: photoList,
      featuredOrder: map['featuredOrder'] as int?,
      kind: (map['kind'] as String?) ?? JobKind.request,
      poster: JobPoster.fromMap(map['poster']),
      offerCount: (map['offerCount'] as num?)?.toInt() ?? 0,
      dueDate: map['dueDate'] as String?,
      dueTime: map['dueTime'] as String?,
      dueAnyTime: map['dueAnyTime'] == true,
      scheduleFlexibility: map['scheduleFlexibility'] as String?,
    );
  }

  static IconData getIconForCategory(String? category) {
    switch (category?.toLowerCase()) {
      // Ev & Yaşam
      case 'temizlik':              return Icons.cleaning_services_outlined;
      case 'boya & badana':         return Icons.format_paint_outlined;
      case 'bahçe & peyzaj':        return Icons.yard_outlined;
      case 'nakliyat':              return Icons.local_shipping_outlined;
      case 'mobilya montaj':        return Icons.chair_outlined;
      case 'haşere kontrolü':       return Icons.pest_control_outlined;
      case 'havuz & spa':           return Icons.pool_outlined;
      case 'çilingir & kilit':      return Icons.lock_outline;
      // Yapı & Tesisat
      case 'elektrikçi':            return Icons.electrical_services_outlined;
      case 'tesisat':               return Icons.plumbing_outlined;
      case 'klima & ısıtma':        return Icons.ac_unit_outlined;
      case 'klima servis':          return Icons.ac_unit_outlined;
      case 'zemin & parke':         return Icons.layers_outlined;
      case 'çatı & yalıtım':       return Icons.roofing_outlined;
      case 'marangoz & ahşap':      return Icons.carpenter_outlined;
      case 'cam & doğrama':         return Icons.window_outlined;
      case 'alçıpan & asma tavan':  return Icons.construction_outlined;
      case 'güvenlik sistemleri':   return Icons.security_outlined;
      // Dijital & Teknik
      case 'bilgisayar & it':       return Icons.computer_outlined;
      case 'grafik & tasarım':      return Icons.palette_outlined;
      case 'web & yazılım':         return Icons.language_outlined;
      case 'fotoğraf & video':      return Icons.camera_alt_outlined;
      // Etkinlik & Yaşam
      case 'düğün & organizasyon':  return Icons.celebration_outlined;
      case 'özel ders & eğitim':    return Icons.school_outlined;
      case 'sağlık & güzellik':     return Icons.spa_outlined;
      case 'evcil hayvan':          return Icons.pets_outlined;
      // Araç & Taşıt
      case 'araç & oto bakım':      return Icons.directions_car_outlined;
      default:                       return Icons.build_outlined;
    }
  }

  static Color getColorForCategory(String? category) {
    switch (category?.toLowerCase()) {
      // Ev & Yaşam
      case 'temizlik':              return Colors.blue;
      case 'boya & badana':         return Colors.orange;
      case 'bahçe & peyzaj':        return Colors.green;
      case 'nakliyat':              return Colors.redAccent;
      case 'mobilya montaj':        return Colors.brown;
      case 'haşere kontrolü':       return Colors.lime.shade700;
      case 'havuz & spa':           return Colors.cyan;
      case 'çilingir & kilit':      return Colors.blueGrey;
      // Yapı & Tesisat
      case 'elektrikçi':            return Colors.purple;
      case 'tesisat':               return Colors.teal;
      case 'klima & ısıtma':        return Colors.lightBlue;
      case 'klima servis':          return Colors.lightBlue;
      case 'zemin & parke':         return Colors.deepOrange;
      case 'çatı & yalıtım':       return Colors.brown.shade700;
      case 'marangoz & ahşap':      return Colors.brown.shade600;
      case 'cam & doğrama':         return Colors.indigo;
      case 'alçıpan & asma tavan':  return Colors.blueGrey.shade600;
      case 'güvenlik sistemleri':   return Colors.red.shade700;
      // Dijital & Teknik
      case 'bilgisayar & it':       return Colors.deepPurple;
      case 'grafik & tasarım':      return Colors.pink;
      case 'web & yazılım':         return Colors.blue.shade700;
      case 'fotoğraf & video':      return Colors.amber.shade800;
      // Etkinlik & Yaşam
      case 'düğün & organizasyon':  return Colors.pinkAccent;
      case 'özel ders & eğitim':    return Colors.indigo.shade600;
      case 'sağlık & güzellik':     return Colors.teal.shade400;
      case 'evcil hayvan':          return Colors.orange.shade700;
      // Araç & Taşıt
      case 'araç & oto bakım':      return Colors.grey.shade700;
      default:                       return Colors.grey;
    }
  }

  static String _timeAgo(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1)  return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk önce';
      if (diff.inHours   < 24) return '${diff.inHours} saat önce';
      if (diff.inDays    < 30) return '${diff.inDays} gün önce';
      return '${(diff.inDays / 30).floor()} ay önce';
    } catch (_) {
      return '';
    }
  }
}

final jobsProvider = StateNotifierProvider<JobNotifier, AsyncValue<List<Job>>>((ref) {
  final notifier = JobNotifier(ref.watch(jobRepositoryProvider),
      kind: JobKind.request);
  // Filter değiştiğinde liste yeniden hesaplansın
  ref.listen<JobFilter>(jobFilterProvider, (_, next) {
    notifier.applyFilter(next);
  });
  return notifier;
});

/// Phase Two-Sided — Usta hizmet ilanları (kind='offer')
final serviceListingsProvider =
    StateNotifierProvider<JobNotifier, AsyncValue<List<Job>>>((ref) {
  final notifier = JobNotifier(ref.watch(jobRepositoryProvider),
      kind: JobKind.offer);
  ref.listen<JobFilter>(jobFilterProvider, (_, next) {
    notifier.applyFilter(next);
  });
  return notifier;
});

class JobNotifier extends StateNotifier<AsyncValue<List<Job>>> {
  final JobRepository _repository;
  final String _kind;
  List<Job> _allJobs = [];
  String? _currentCategory;
  JobFilter _filter = const JobFilter();
  double? _lat; // proximity sıralaması için kullanıcı konumu (varsa)
  double? _lng;

  /// Kullanıcı konumunu ayarla ve yeniden çek (proximity sıralama için).
  Future<void> setLocation(double lat, double lng) {
    _lat = lat;
    _lng = lng;
    return fetchJobs(category: _currentCategory);
  }

  JobNotifier(this._repository, {String kind = JobKind.request})
      : _kind = kind,
        super(const AsyncValue.loading()) {
    fetchJobs();
  }

  Future<void> fetchJobs({String? category, String? q}) async {
    _currentCategory = category;
    state = const AsyncValue.loading();
    try {
      final jobsData = await _repository.getJobs(
          category: category,
          q: q,
          status: 'open',
          kind: _kind,
          lat: _lat,
          lng: _lng,
          // Phase 301 — Mesafe filtresi server-side Haversine ile uygulanır.
          radiusKm: _filter.maxRadiusKm);
      _allJobs = jobsData.map((m) => Job.fromMap(m)).toList();
      state = AsyncValue.data(_applyFilter(_allJobs));
    } catch (e, st) {
      debugPrint('jobsProvider.fetchJobs error: $e\n$st');
      state = AsyncValue.error(e, st);
    }
  }

  /// Server-side keyword search — refetches with q param
  Future<void> setQuery(String query) async {
    final q = query.trim();
    await fetchJobs(category: _currentCategory, q: q.isEmpty ? null : q);
  }

  /// Filter güncellendiğinde mevcut _allJobs üzerinden yeniden hesapla.
  /// Phase 301 — Mesafe filtresi değişirse backend tekrar çağrılır.
  void applyFilter(JobFilter filter) {
    final radiusChanged = _filter.maxRadiusKm != filter.maxRadiusKm;
    _filter = filter;
    if (radiusChanged) {
      fetchJobs(category: _currentCategory);
      return;
    }
    if (_allJobs.isEmpty) return;
    state = AsyncValue.data(_applyFilter(_allJobs));
  }

  List<Job> _applyFilter(List<Job> input) {
    Iterable<Job> result = input;
    if (_filter.budgetMin != null) {
      result = result.where((j) {
        final b = j.budgetMax ?? j.budgetMin ?? 0;
        return b >= _filter.budgetMin!;
      });
    }
    if (_filter.budgetMax != null) {
      result = result.where((j) {
        final b = j.budgetMin ?? j.budgetMax ?? 0;
        return b <= _filter.budgetMax!;
      });
    }
    if (_filter.featuredOnly) {
      result = result.where((j) => j.isFeatured);
    }
    final list = result.toList();
    switch (_filter.sort) {
      case JobSort.newest:
        list.sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
        break;
      case JobSort.budgetHigh:
        list.sort((a, b) =>
            (b.budgetMax ?? b.budgetMin ?? 0)
                .compareTo(a.budgetMax ?? a.budgetMin ?? 0));
        break;
      case JobSort.budgetLow:
        list.sort((a, b) =>
            (a.budgetMin ?? a.budgetMax ?? 0)
                .compareTo(b.budgetMin ?? b.budgetMax ?? 0));
        break;
    }
    return list;
  }

  void filterJobs(String query) {
    if (query.isEmpty) {
      state = AsyncValue.data(_applyFilter(_allJobs));
    } else {
      final lower = query.toLowerCase();
      final filtered = _allJobs.where((j) =>
        j.title.toLowerCase().contains(lower) ||
        j.desc.toLowerCase().contains(lower)
      ).toList();
      state = AsyncValue.data(_applyFilter(filtered));
    }
  }

  Future<Map<String, dynamic>> addJob(Map<String, dynamic> jobData) async {
    try {
      final created = await _repository.createJob(jobData);
      await fetchJobs();
      return created;
    } catch (e, st) {
      debugPrint('jobsProvider.addJob error: $e\n$st');
      rethrow;
    }
  }
}
