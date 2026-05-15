// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseOfferTemplatesRepositoryProvider =
    Provider((_) => FirebaseOfferTemplatesRepository());

final firebaseOfferTemplatesProvider =
    FutureProvider<List<Map<String, dynamic>>>(
        (ref) => ref.read(firebaseOfferTemplatesRepositoryProvider).getMy());

class FirebaseOfferTemplatesRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getMy() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    return _fs.query(
      _fs.col('offer_templates')
          .where('userId', isEqualTo: uid)
          .orderBy('createdAt', descending: true),
    );
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> dto) async {
    final uid = _fs.uid!;
    final id = await _fs.add('offer_templates', {...dto, 'userId': uid});
    return {'id': id, ...dto};
  }

  Future<void> delete(String id) => _fs.delete('offer_templates/$id');
}
