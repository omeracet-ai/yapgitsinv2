import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseFavoritesRepositoryProvider = Provider((ref) {
  return FirebaseFavoritesRepository(fs: FirestoreService.instance);
});

class FirebaseFavoritesRepository {
  final FirestoreService _fs;

  FirebaseFavoritesRepository({required FirestoreService fs}) : _fs = fs;

  Future<bool> toggleFavorite(String workerId) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Oturum bulunamadı');
    final docPath = 'favorites/$uid/workers/$workerId';
    final snap = await _fs.db.doc(docPath).get();
    if (snap.exists) {
      await _fs.delete(docPath);
      return false;
    } else {
      await _fs.db.doc(docPath).set({
        'workerId': workerId,
        'createdAt': _fs.serverNow,
      });
      return true;
    }
  }

  Future<bool> removeFavorite(String workerId) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Oturum bulunamadı');
    await _fs.delete('favorites/$uid/workers/$workerId');
    return false;
  }

  Future<List<Map<String, dynamic>>> getMyFavorites() async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Oturum bulunamadı');
    final snap =
        await _fs.db.collection('favorites/$uid/workers').get();
    final workerIds =
        snap.docs.map((d) => d.id).toList();
    if (workerIds.isEmpty) return [];

    final results = <Map<String, dynamic>>[];
    for (final wid in workerIds) {
      final data = await _fs.getDoc('providers/$wid');
      if (data != null) results.add(data);
    }
    return results;
  }
}
