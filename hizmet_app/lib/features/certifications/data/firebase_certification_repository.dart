// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/firestore_service.dart';

class WorkerCertification {
  final String id;
  final String name;
  final String issuer;
  final DateTime issuedAt;
  final DateTime? expiresAt;
  final String? documentUrl;
  final bool verified;

  WorkerCertification({required this.id, required this.name, required this.issuer, required this.issuedAt, this.expiresAt, this.documentUrl, required this.verified});

  factory WorkerCertification.fromJson(Map<String, dynamic> j) => WorkerCertification(
        id: (j['id'] ?? j['_id'] ?? '') as String,
        name: (j['name'] ?? '') as String,
        issuer: (j['issuer'] ?? '') as String,
        issuedAt: (j['issuedAt'] is Timestamp)
            ? (j['issuedAt'] as Timestamp).toDate()
            : DateTime.tryParse((j['issuedAt'] ?? '') as String) ?? DateTime.now(),
        expiresAt: j['expiresAt'] != null
            ? (j['expiresAt'] is Timestamp
                ? (j['expiresAt'] as Timestamp).toDate()
                : DateTime.tryParse(j['expiresAt'] as String))
            : null,
        documentUrl: j['documentUrl'] as String?,
        verified: (j['verified'] ?? false) as bool,
      );
}

final firebaseCertificationRepositoryProvider =
    Provider((_) => FirebaseCertificationRepository());

class FirebaseCertificationRepository {
  final _fs = FirestoreService.instance;

  /// Alias for [getMine] for backward compatibility.
  Future<List<WorkerCertification>> listMine() => getMine();

  Future<List<WorkerCertification>> getMine() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final docs = await _fs.query(
      _fs.col('certifications')
          .where('userId', isEqualTo: uid)
          .orderBy('issuedAt', descending: true),
    );
    return docs.map(WorkerCertification.fromJson).toList();
  }

  Future<List<WorkerCertification>> getForUser(String userId) async {
    final docs = await _fs.query(
      _fs.col('certifications')
          .where('userId', isEqualTo: userId)
          .where('verified', isEqualTo: true),
    );
    return docs.map(WorkerCertification.fromJson).toList();
  }

  Future<WorkerCertification> add({
    required String name,
    required String issuer,
    required DateTime issuedAt,
    DateTime? expiresAt,
    List<int>? documentBytes,
    String? fileName,
  }) async {
    final uid = _fs.uid!;
    String? documentUrl;

    if (documentBytes != null && fileName != null) {
      final ref = FirebaseStorage.instance
          .ref('certifications/$uid/$fileName');
      await ref.putData(documentBytes as dynamic);
      documentUrl = await ref.getDownloadURL();
    }

    final id = await _fs.add('certifications', {
      'userId': uid,
      'name': name,
      'issuer': issuer,
      'issuedAt': Timestamp.fromDate(issuedAt),
      if (expiresAt != null) 'expiresAt': Timestamp.fromDate(expiresAt),
      if (documentUrl != null) 'documentUrl': documentUrl,
      'verified': false,
    });

    return WorkerCertification(id: id, name: name, issuer: issuer, issuedAt: issuedAt, expiresAt: expiresAt, documentUrl: documentUrl, verified: false);
  }

  Future<void> delete(String id) => _fs.delete('certifications/$id');

  /// Alias for [delete] — compatibility with certifications_section.dart.
  Future<void> remove(String id) => delete(id);

  /// Upload a certification document file and return its download URL.
  Future<String> uploadDocument(XFile file) async {
    final uid = _fs.uid!;
    final bytes = await file.readAsBytes();
    final ref = FirebaseStorage.instance
        .ref('certifications/$uid/${file.name}');
    await ref.putData(bytes as dynamic);
    return ref.getDownloadURL();
  }

  /// Create a new certification (alias matching certifications_section.dart signature).
  Future<WorkerCertification> create({
    required String name,
    required String issuer,
    required DateTime issuedAt,
    DateTime? expiresAt,
    String? documentUrl,
  }) async {
    return add(
      name: name,
      issuer: issuer,
      issuedAt: issuedAt,
      expiresAt: expiresAt,
    );
  }
}
