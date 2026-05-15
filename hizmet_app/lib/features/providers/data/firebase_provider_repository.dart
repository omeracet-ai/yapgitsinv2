import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';
import 'worker_filter.dart';

final firebaseProviderRepositoryProvider = Provider((ref) {
  return FirebaseProviderRepository(fs: FirestoreService.instance);
});

final firebaseWorkerFilterProvider =
    StateProvider<WorkerFilter>((ref) => WorkerFilter.empty);

final firebaseAllProvidersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, search) async {
  final filter = ref.watch(firebaseWorkerFilterProvider);
  return ref.watch(firebaseProviderRepositoryProvider).getAllProviders(
        search: search.isEmpty ? null : search,
        filter: filter,
      );
});

final firebaseProviderDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, providerId) async {
  return ref.watch(firebaseProviderRepositoryProvider).getProvider(providerId);
});

final firebaseMyProviderProfileProvider =
    FutureProvider.family<Map<String, dynamic>?, String>((ref, userId) async {
  return ref.watch(firebaseProviderRepositoryProvider).getProviderByUserId(userId);
});

final firebaseProviderReviewsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, userId) async {
  return ref.watch(firebaseProviderRepositoryProvider).getReviewsForUser(userId);
});

final firebaseProviderCompletedJobsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, providerId) async {
  return ref.watch(firebaseProviderRepositoryProvider).getCompletedJobs(providerId);
});

/// Aliases so screens that import this file can use the original provider names.
final providerDetailProvider = firebaseProviderDetailProvider;
final providerReviewsProvider = firebaseProviderReviewsProvider;
final providerCompletedJobsProvider = firebaseProviderCompletedJobsProvider;
final allProvidersProvider = firebaseAllProvidersProvider;
final workerFilterProvider = firebaseWorkerFilterProvider;
final myProviderProfileProvider = firebaseMyProviderProfileProvider;

class FirebaseProviderRepository {
  final FirestoreService _fs;

  FirebaseProviderRepository({required FirestoreService fs}) : _fs = fs;

  Future<List<Map<String, dynamic>>> getAllProviders({
    String? search,
    WorkerFilter? filter,
  }) async {
    Query<Map<String, dynamic>> q = _fs.col('providers');

    if (filter != null) {
      if (filter.verifiedOnly) {
        q = q.where('verified', isEqualTo: true);
      }
      if (filter.availableOnly) {
        q = q.where('available', isEqualTo: true);
      }
      if (filter.minRating != null) {
        q = q.where('rating', isGreaterThanOrEqualTo: filter.minRating);
      }
      if (filter.minRate != null) {
        q = q.where('hourlyRate', isGreaterThanOrEqualTo: filter.minRate);
      }
      if (filter.maxRate != null) {
        q = q.where('hourlyRate', isLessThanOrEqualTo: filter.maxRate);
      }
    }

    final docs = await _fs.query(q);

    if (search != null && search.isNotEmpty) {
      final s = search.toLowerCase();
      return docs
          .where((d) =>
              (d['businessName'] as String? ?? '').toLowerCase().contains(s) ||
              (d['bio'] as String? ?? '').toLowerCase().contains(s))
          .toList();
    }
    return docs;
  }

  Future<Map<String, dynamic>> getProvider(String id) async {
    final data = await _fs.getDoc('providers/$id');
    if (data == null) throw Exception('Sağlayıcı bilgisi alınamadı');
    return data;
  }

  Future<Map<String, dynamic>?> getProviderByUserId(String userId) async {
    final snap = await _fs
        .col('providers')
        .where('userId', isEqualTo: userId)
        .limit(1)
        .get();
    if (snap.docs.isEmpty) return null;
    final d = snap.docs.first;
    return {'id': d.id, ...d.data()};
  }

  Future<Map<String, dynamic>> createProvider({
    required String businessName,
    String? bio,
    Map<String, String>? documents,
  }) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Sağlayıcı profili oluşturulamadı');
    final data = <String, dynamic>{
      'userId': uid,
      'businessName': businessName,
      if (bio != null && bio.isNotEmpty) 'bio': bio,
      if (documents != null) 'documents': documents,
    };
    final id = await _fs.add('providers', data);
    return {'id': id, ...data};
  }

  Future<Map<String, dynamic>> updateProvider(
      String id, Map<String, dynamic> data) async {
    await _fs.update('providers/$id', data);
    final updated = await _fs.getDoc('providers/$id');
    if (updated == null) throw Exception('Güncelleme başarısız');
    return updated;
  }

  Future<List<Map<String, dynamic>>> getReviewsForUser(String userId) async {
    try {
      final snap = await _fs
          .col('reviews')
          .where('revieweeId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();
      return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getCompletedJobs(String providerId) async {
    try {
      final snap = await _fs
          .col('jobs')
          .where('providerId', isEqualTo: providerId)
          .where('status', isEqualTo: 'completed')
          .get();
      return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
    } catch (_) {
      return [];
    }
  }
}
