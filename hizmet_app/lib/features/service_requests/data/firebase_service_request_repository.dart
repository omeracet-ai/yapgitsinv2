// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseServiceRequestRepositoryProvider =
    Provider((_) => FirebaseServiceRequestRepository());

class FirebaseServiceRequestRepository {
  final _fs = FirestoreService.instance;

  Future<List<Map<String, dynamic>>> getAll({String? category}) async {
    Query<Map<String, dynamic>> q =
        _fs.col('service_requests').where('status', isEqualTo: 'active');
    if (category != null) q = q.where('category', isEqualTo: category);
    return _fs.query(q.orderBy('createdAt', descending: true).limit(50));
  }

  Future<List<Map<String, dynamic>>> getMine() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    return _fs.query(
      _fs.col('service_requests')
          .where('userId', isEqualTo: uid)
          .orderBy('createdAt', descending: true),
    );
  }

  Future<Map<String, dynamic>> create({
    required String title,
    required String description,
    required String category,
    String? categoryId,
    required String location,
    String? address,
    String? imageUrl,
    double? latitude,
    double? longitude,
  }) async {
    final uid = _fs.uid!;
    final id = await _fs.add('service_requests', {
      'userId': uid,
      'title': title,
      'description': description,
      'category': category,
      if (categoryId != null) 'categoryId': categoryId,
      'location': location,
      if (address != null) 'address': address,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'status': 'active',
      'applicationCount': 0,
    });
    return {'id': id, 'userId': uid, 'title': title};
  }

  Future<Map<String, dynamic>> getDetail(String id) async {
    final doc = await _fs.getDoc('service_requests/$id');
    if (doc == null) throw Exception('İlan bulunamadı');
    return doc;
  }

  Future<void> apply(String requestId, {String? message}) async {
    final uid = _fs.uid!;
    await _fs.add('service_request_applications', {
      'requestId': requestId,
      'workerId': uid,
      'message': message ?? '',
      'status': 'pending',
    });
    await _fs.db
        .doc('service_requests/$requestId')
        .update({'applicationCount': FieldValue.increment(1)});
  }

  Future<void> delete(String id) => _fs.delete('service_requests/$id');

  Future<List<Map<String, dynamic>>> getApplications(String requestId) =>
      _fs.query(
        _fs.col('service_request_applications')
            .where('requestId', isEqualTo: requestId),
      );
}
