import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';

/// Uygulama genelinde paylaşılan Firebase instance'ları.
/// Her repository bu servisi kullanır.
class FirestoreService {
  static final FirestoreService instance = FirestoreService._();
  FirestoreService._();

  final FirebaseFirestore db = FirebaseFirestore.instance;
  final FirebaseAuth auth = FirebaseAuth.instance;
  final FirebaseStorage storage = FirebaseStorage.instance;

  String? get uid => auth.currentUser?.uid;

  CollectionReference<Map<String, dynamic>> col(String path) =>
      db.collection(path);

  DocumentReference<Map<String, dynamic>> doc(String path) =>
      db.doc(path);

  FieldValue get serverNow => FieldValue.serverTimestamp();

  /// Tek document çek — null safe
  Future<Map<String, dynamic>?> getDoc(String path) async {
    final snap = await db.doc(path).get();
    if (!snap.exists) return null;
    return {'id': snap.id, ...snap.data()!};
  }

  /// Collection sorgula, List<Map> döner
  Future<List<Map<String, dynamic>>> query(
    Query<Map<String, dynamic>> q,
  ) async {
    final snap = await q.get();
    return snap.docs.map((d) => {'id': d.id, ...d.data()}).toList();
  }

  /// Document ekle → id döner
  Future<String> add(String collection, Map<String, dynamic> data) async {
    final ref = await db.collection(collection).add({
      ...data,
      'createdAt': serverNow,
      'updatedAt': serverNow,
    });
    return ref.id;
  }

  /// Document güncelle
  Future<void> update(String path, Map<String, dynamic> data) =>
      db.doc(path).update({...data, 'updatedAt': serverNow});

  /// Document sil
  Future<void> delete(String path) => db.doc(path).delete();

  /// Real-time stream — collection
  Stream<List<Map<String, dynamic>>> stream(
    Query<Map<String, dynamic>> q,
  ) =>
      q.snapshots().map(
            (snap) =>
                snap.docs.map((d) => {'id': d.id, ...d.data()}).toList(),
          );
}
