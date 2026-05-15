import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseReviewRepositoryProvider = Provider((ref) {
  return FirebaseReviewRepository(fs: FirestoreService.instance);
});

final firebaseReceivedReviewsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, userId) {
  return ref.watch(firebaseReviewRepositoryProvider).getReviewsForUser(userId);
});

class FirebaseReviewRepository {
  final FirestoreService _fs;

  FirebaseReviewRepository({required FirestoreService fs}) : _fs = fs;

  Future<void> createReview({
    String? jobId,
    required String revieweeId,
    required int rating,
    required String comment,
  }) async {
    final uid = _fs.uid;
    if (uid == null) {
      throw Exception('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    }
    try {
      await _fs.db.collection('reviews').add({
        'reviewerId': uid,
        'revieweeId': revieweeId,
        if (jobId != null) 'jobId': jobId,
        'rating': rating,
        'comment': comment,
        'createdAt': _fs.serverNow,
        'updatedAt': _fs.serverNow,
      });
    } catch (e) {
      throw Exception('Yorum gönderilemedi: $e');
    }
  }

  Future<Map<String, dynamic>> replyToReview(
      String reviewId, String text) async {
    final uid = _fs.uid;
    if (uid == null) {
      throw Exception('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    }
    final snap = await _fs.db.doc('reviews/$reviewId').get();
    if (!snap.exists) throw Exception('Yorum bulunamadı.');
    final data = snap.data()!;
    if (data['revieweeId'] != uid) {
      throw Exception('Bu yoruma yanıt verme yetkiniz yok.');
    }
    final reply = {'text': text, 'repliedAt': _fs.serverNow};
    await _fs.db.doc('reviews/$reviewId').update({
      'reply': reply,
      'updatedAt': _fs.serverNow,
    });
    return {'id': reviewId, ...data, 'reply': reply};
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

  Future<int> markHelpful(String reviewId) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('İstek başarısız');
    final reviewRef = _fs.db.doc('reviews/$reviewId');
    final snap = await reviewRef.get();
    if (!snap.exists) throw Exception('İstek başarısız');
    final data = snap.data()!;
    if (data['reviewerId'] == uid) {
      throw Exception('Kendi yorumunuza oy veremezsiniz.');
    }
    final helpfulRef = reviewRef.collection('helpful').doc(uid);
    final helpfulSnap = await helpfulRef.get();
    if (helpfulSnap.exists) {
      throw Exception('Bu yorumu zaten faydalı buldunuz.');
    }
    await helpfulRef.set({'uid': uid, 'createdAt': _fs.serverNow});
    final updated = await reviewRef.update({
      'helpfulCount': FieldValue.increment(1),
      'updatedAt': _fs.serverNow,
    });
    final refreshed = await reviewRef.get();
    return (refreshed.data()?['helpfulCount'] as num?)?.toInt() ?? 0;
  }
}
