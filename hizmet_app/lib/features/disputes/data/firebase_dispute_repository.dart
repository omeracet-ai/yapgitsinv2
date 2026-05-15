// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseDisputeRepositoryProvider =
    Provider((_) => FirebaseDisputeRepository());

/// Alias so screens that import this file can use [disputeRepositoryProvider].
final disputeRepositoryProvider = firebaseDisputeRepositoryProvider;

class FirebaseDisputeRepository {
  final _fs = FirestoreService.instance;

  Future<Map<String, dynamic>> createDispute({
    String? jobId,
    String? bookingId,
    required String againstUserId,
    required String type,
    required String description,
  }) async {
    final uid = _fs.uid!;
    final id = await _fs.add('disputes', {
      'reporterId': uid,
      'againstUserId': againstUserId,
      if (jobId != null) 'jobId': jobId,
      if (bookingId != null) 'bookingId': bookingId,
      'type': type,
      'description': description,
      'status': 'open',
    });
    return {'id': id, 'status': 'open'};
  }

  Future<List<Map<String, dynamic>>> myDisputes() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    return _fs.query(
      _fs.col('disputes')
          .where('reporterId', isEqualTo: uid)
          .orderBy('createdAt', descending: true),
    );
  }

  Future<Map<String, dynamic>> getDetail(String id) async {
    final doc = await _fs.getDoc('disputes/$id');
    if (doc == null) throw Exception('Şikayet bulunamadı');
    return doc;
  }
}
