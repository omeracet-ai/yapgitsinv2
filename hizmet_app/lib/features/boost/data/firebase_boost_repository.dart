// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseBoostRepositoryProvider =
    Provider((_) => FirebaseBoostRepository());

final firebaseBoostPackagesProvider =
    FutureProvider<List<Map<String, dynamic>>>(
        (ref) => ref.read(firebaseBoostRepositoryProvider).getPackages());

final firebaseMyBoostsProvider =
    FutureProvider<Map<String, List<Map<String, dynamic>>>>(
        (ref) => ref.read(firebaseBoostRepositoryProvider).getMy());

class FirebaseBoostRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getPackages() =>
      _fs.query(_fs.col('boost_packages').where('isActive', isEqualTo: true));

  Future<Map<String, List<Map<String, dynamic>>>> getMy() async {
    final uid = _fs.uid;
    if (uid == null) return {'active': [], 'history': []};
    final now = Timestamp.now();
    final all = await _fs.query(
      _fs.col('boosts').where('userId', isEqualTo: uid),
    );
    final active = all.where((b) {
      final exp = b['expiresAt'];
      return exp != null && (exp as Timestamp).compareTo(now) > 0;
    }).toList();
    final history = all.where((b) {
      final exp = b['expiresAt'];
      return exp == null || (exp as Timestamp).compareTo(now) <= 0;
    }).toList();
    return {'active': active, 'history': history};
  }

  Future<Map<String, dynamic>> purchase(String type) async {
    final uid = _fs.uid!;
    final id = await _fs.add('payment_requests', {
      'userId': uid,
      'type': 'boost',
      'boostType': type,
      'status': 'pending',
    });
    return {'id': id, 'status': 'pending', 'message': 'Ödeme işleminiz işleniyor'};
  }
}
