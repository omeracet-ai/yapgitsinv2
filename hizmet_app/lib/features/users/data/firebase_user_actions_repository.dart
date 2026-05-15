import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseUserActionsRepositoryProvider = Provider((ref) {
  return FirebaseUserActionsRepository(fs: FirestoreService.instance);
});

class FirebaseUserActionsRepository {
  final FirestoreService _fs;

  FirebaseUserActionsRepository({required FirestoreService fs}) : _fs = fs;

  Future<void> blockUser(String userId) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Oturum bulunamadı');
    await _fs.db.doc('users/$uid/blocked/$userId').set({
      'userId': userId,
      'createdAt': _fs.serverNow,
    });
  }

  Future<void> unblockUser(String userId) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Bağlantı hatası');
    await _fs.delete('users/$uid/blocked/$userId');
  }

  Future<List<Map<String, dynamic>>> blockedUsers() async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Bağlantı hatası');
    final snap = await _fs.db.collection('users/$uid/blocked').get();
    final ids = snap.docs.map((d) => d.id).toList();
    if (ids.isEmpty) return [];
    final results = <Map<String, dynamic>>[];
    for (final id in ids) {
      final data = await _fs.getDoc('users/$id');
      if (data != null) results.add(data);
    }
    return results;
  }

  Future<void> reportUser(
    String userId,
    String reason, {
    String? description,
  }) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Şikayet gönderilemedi');
    await _fs.db.collection('reports').add({
      'reporterId': uid,
      'reportedUserId': userId,
      'reason': reason,
      if (description != null && description.isNotEmpty)
        'description': description,
      'createdAt': _fs.serverNow,
    });
  }
}
