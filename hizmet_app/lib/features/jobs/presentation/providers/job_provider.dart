import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/firebase_job_repository.dart';

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
  });

  factory Job.fromMap(Map<String, dynamic> map) {
    final bMin = (map['budgetMin'] as num?)?.toDouble();
    final bMax = (map['budgetMax'] as num?)?.toDouble();
    final budgetStr = bMin != null && bMax != null
        ? '${bMin.toInt()} – ${bMax.toInt()} ₺'
        : bMin != null ? '${bMin.toInt()} ₺' : 'Belirtilmemiş';

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
  return JobNotifier(ref.watch(firebaseJobRepositoryProvider));
});

class JobNotifier extends StateNotifier<AsyncValue<List<Job>>> {
  final FirebaseJobRepository _repository;
  List<Job> _allJobs = [];
  String? _currentCategory;

  JobNotifier(this._repository) : super(const AsyncValue.loading()) {
    fetchJobs();
  }

  Future<void> fetchJobs({String? category, String? q}) async {
    _currentCategory = category;
    state = const AsyncValue.loading();
    try {
      final jobsData = await _repository.getJobs(category: category, q: q);
      _allJobs = jobsData.map((m) => Job.fromMap(m)).toList();
      state = AsyncValue.data(_allJobs);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Server-side keyword search — refetches with q param
  Future<void> setQuery(String query) async {
    final q = query.trim();
    await fetchJobs(category: _currentCategory, q: q.isEmpty ? null : q);
  }

  void filterJobs(String query) {
    if (query.isEmpty) {
      state = AsyncValue.data(_allJobs);
    } else {
      final filtered = _allJobs.where((j) =>
        j.title.toLowerCase().contains(query.toLowerCase()) ||
        j.desc.toLowerCase().contains(query.toLowerCase())
      ).toList();
      state = AsyncValue.data(filtered);
    }
  }

  Future<void> addJob(Map<String, dynamic> jobData) async {
    try {
      await _repository.createJob(jobData);
      await fetchJobs();
    } catch (e) {
      // Handle error
    }
  }
}
