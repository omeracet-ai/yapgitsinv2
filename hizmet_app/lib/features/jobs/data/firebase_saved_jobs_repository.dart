// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseSavedJobsRepositoryProvider = Provider((ref) {
  return FirebaseSavedJobsRepository();
});

class FirebaseSavedJobsRepository {
  final _fs = FirestoreService.instance;

  /// Kaydeder — { saved: true, jobId } semantiği korunur
  Future<bool> saveJob(String jobId) async {
    try {
      final uid = _fs.uid;
      if (uid == null) throw Exception('Oturum açılmamış.');
      final docId = '${uid}_$jobId';
      await _fs.db.collection('saved_jobs').doc(docId).set({
        'userId': uid,
        'jobId': jobId,
        'savedAt': _fs.serverNow,
      });
      return true;
    } catch (e) {
      throw Exception('İlan kaydedilemedi: $e');
    }
  }

  /// Kaydı kaldırır — dönen bool false (eski API'ye paralel)
  Future<bool> unsaveJob(String jobId) async {
    try {
      final uid = _fs.uid;
      if (uid == null) throw Exception('Oturum açılmamış.');
      final docId = '${uid}_$jobId';
      await _fs.delete('saved_jobs/$docId');
      return false;
    } catch (e) {
      throw Exception('Kaldırılamadı: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getMySavedJobs() async {
    try {
      final uid = _fs.uid;
      if (uid == null) return [];
      final query = _fs
          .col('saved_jobs')
          .where('userId', isEqualTo: uid)
          .orderBy('savedAt', descending: true)
          .limit(100);
      final savedDocs = await _fs.query(query);
      if (savedDocs.isEmpty) return [];

      // jobId listesini çek ve job dokümanlarını getir
      final jobIds = savedDocs.map((d) => d['jobId'] as String).toList();
      final jobs = <Map<String, dynamic>>[];
      // Firestore whereIn max 10 — chunk'la
      for (var i = 0; i < jobIds.length; i += 10) {
        final chunk = jobIds.sublist(
            i, i + 10 > jobIds.length ? jobIds.length : i + 10);
        final q = _fs
            .col('jobs')
            .where(FieldPath.documentId, whereIn: chunk);
        jobs.addAll(await _fs.query(q));
      }
      return jobs;
    } catch (e) {
      throw Exception('Kaydedilen ilanlar yüklenemedi: $e');
    }
  }
}
