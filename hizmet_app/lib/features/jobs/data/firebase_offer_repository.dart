// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseOfferRepositoryProvider = Provider((ref) {
  return FirebaseOfferRepository();
});

/// Alias so screens that import this file can use [offerRepositoryProvider].
final offerRepositoryProvider = firebaseOfferRepositoryProvider;

final jobOffersProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, jobId) async {
  return ref.watch(firebaseOfferRepositoryProvider).getOffersForJob(jobId);
});

class FirebaseOfferRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getOffersForJob(String jobId) async {
    try {
      final query = _fs
          .col('offers')
          .where('jobId', isEqualTo: jobId)
          .orderBy('createdAt', descending: false);
      return await _fs.query(query);
    } catch (e) {
      throw Exception('Teklifler yüklenemedi: $e');
    }
  }

  Future<Map<String, dynamic>> createOffer(
      String jobId, double price, String message,
      {List<Map<String, dynamic>>? lineItems}) async {
    try {
      final uid = _fs.uid;
      final data = <String, dynamic>{
        'jobId': jobId,
        'providerId': uid,
        'price': price,
        'message': message,
        'status': 'pending',
        if (lineItems != null && lineItems.isNotEmpty) 'lineItems': lineItems,
      };
      final id = await _fs.add('offers', data);
      return {'id': id, ...data};
    } catch (e) {
      throw Exception('Teklif gönderilemedi: $e');
    }
  }

  Future<void> acceptOffer(String jobId, String offerId) async {
    try {
      await _fs.update('offers/$offerId', {'status': 'accepted', 'jobId': jobId});
      await _fs.update('jobs/$jobId', {'status': 'assigned', 'assignedOfferId': offerId});
    } catch (e) {
      throw Exception('Teklif kabul edilemedi: $e');
    }
  }

  Future<void> rejectOffer(String jobId, String offerId) async {
    try {
      await _fs.update('offers/$offerId', {'status': 'rejected', 'jobId': jobId});
    } catch (e) {
      throw Exception('Teklif reddedilemedi: $e');
    }
  }

  Future<Map<String, dynamic>> withdrawOffer(String jobId, String offerId) async {
    try {
      await _fs.update('offers/$offerId', {'status': 'withdrawn', 'jobId': jobId});
      return {'id': offerId, 'status': 'withdrawn'};
    } catch (e) {
      throw Exception('Teklif geri çekilemedi: $e');
    }
  }

  Future<void> counterOffer(
      String jobId, String offerId, double price, String message) async {
    try {
      await _fs.update('offers/$offerId', {
        'counterPrice': price,
        'counterMessage': message,
        'status': 'countered',
        'jobId': jobId,
      });
    } catch (e) {
      throw Exception('Pazarlık teklifi gönderilemedi: $e');
    }
  }

  Future<void> updateJob(String jobId, Map<String, dynamic> data) async {
    try {
      await _fs.update('jobs/$jobId', data);
    } catch (e) {
      throw Exception('İlan güncellenemedi: $e');
    }
  }

  Future<void> deleteJob(String jobId) async {
    try {
      await _fs.delete('jobs/$jobId');
    } catch (e) {
      throw Exception('İlan silinemedi: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getMyOffers() async {
    try {
      final uid = _fs.uid;
      if (uid == null) throw Exception('Oturum açılmamış.');
      final query = _fs
          .col('offers')
          .where('providerId', isEqualTo: uid)
          .orderBy('createdAt', descending: true)
          .limit(100);
      return await _fs.query(query);
    } catch (e) {
      throw Exception('Teklifler yüklenemedi: $e');
    }
  }
}
