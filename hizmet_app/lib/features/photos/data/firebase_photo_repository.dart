import 'dart:typed_data';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/utils/media_utils.dart';

final firebasePhotoRepositoryProvider = Provider((ref) {
  return FirebasePhotoRepository(fs: FirestoreService.instance);
});

class FirebasePhotoRepository {
  final FirestoreService _fs;

  FirebasePhotoRepository({required FirestoreService fs}) : _fs = fs;

  Future<Reference> _ref(String path) async =>
      _fs.storage.ref(path);

  Future<String> _upload(
    Reference ref,
    Uint8List bytes, {
    String contentType = 'image/jpeg',
  }) async {
    await ref.putData(bytes, SettableMetadata(contentType: contentType));
    return await ref.getDownloadURL();
  }

  Future<List<String>> uploadJobPhotos(List<XFile> files) async {
    final uid = _fs.uid ?? 'anon';
    final urls = <String>[];
    for (final xfile in files) {
      final compressed = await compressImage(xfile);
      final name =
          '${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
      final ref =
          _fs.storage.ref('jobs/$uid/photos/$name');
      final url = await _upload(ref, compressed);
      urls.add(url);
    }
    return urls;
  }

  Future<String> uploadPortfolioPhoto(XFile xfile) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Portfolyo yüklenemedi');
    final compressed = await compressImage(xfile);
    final name =
        '${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
    final ref =
        _fs.storage.ref('providers/$uid/portfolio/$name');
    final url = await _upload(ref, compressed);
    await _fs.db.doc('users/$uid').set(
      {
        'portfolio': List<String>.from(
          (await _fs.getDoc('users/$uid') ?? {})['portfolio'] as List? ?? [],
        )..add(url),
        'updatedAt': _fs.serverNow,
      },
      SetOptions(merge: true),
    );
    return url;
  }

  Future<void> removePortfolioPhoto(String url) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Fotoğraf silinemedi');
    try {
      await _fs.storage.refFromURL(url).delete();
    } catch (_) {}
    final userData = await _fs.getDoc('users/$uid');
    final portfolio =
        List<String>.from(userData?['portfolio'] as List? ?? [])
          ..remove(url);
    await _fs.db.doc('users/$uid').set(
      {'portfolio': portfolio, 'updatedAt': _fs.serverNow},
      SetOptions(merge: true),
    );
  }

  Future<String> uploadProfilePhoto(XFile xfile) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Profil fotoğrafı yüklenemedi');
    final compressed = await compressImage(xfile);
    final ref = _fs.storage.ref('users/$uid/avatar/profile.jpg');
    return await _upload(ref, compressed);
  }

  Future<String> uploadPortfolioVideo(XFile xfile) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Video yüklenemedi');
    final bytes = await xfile.readAsBytes();
    final name =
        '${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
    final ref =
        _fs.storage.ref('providers/$uid/portfolio/$name');
    final url = await _upload(ref, bytes, contentType: 'video/mp4');
    await _fs.db.doc('users/$uid').set(
      {
        'portfolioVideos': List<String>.from(
          (await _fs.getDoc('users/$uid') ?? {})['portfolioVideos'] as List? ??
              [],
        )..add(url),
        'updatedAt': _fs.serverNow,
      },
      SetOptions(merge: true),
    );
    return url;
  }

  Future<void> removePortfolioVideo(String url) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Video silinemedi');
    try {
      await _fs.storage.refFromURL(url).delete();
    } catch (_) {}
    final userData = await _fs.getDoc('users/$uid');
    final videos =
        List<String>.from(userData?['portfolioVideos'] as List? ?? [])
          ..remove(url);
    await _fs.db.doc('users/$uid').set(
      {'portfolioVideos': videos, 'updatedAt': _fs.serverNow},
      SetOptions(merge: true),
    );
  }

  Future<Map<String, dynamic>> uploadIntroVideo(
    XFile xfile, {
    int? durationSeconds,
  }) async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Tanıtım videosu yüklenemedi');
    final bytes = await xfile.readAsBytes();
    final name =
        '${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
    final ref =
        _fs.storage.ref('providers/$uid/portfolio/intro_$name');
    final url = await _upload(ref, bytes, contentType: 'video/mp4');
    final payload = <String, dynamic>{
      'introVideo': {'url': url, if (durationSeconds != null) 'duration': durationSeconds},
      'updatedAt': _fs.serverNow,
    };
    await _fs.db.doc('users/$uid').set(payload, SetOptions(merge: true));
    return {'url': url, 'duration': durationSeconds};
  }

  Future<void> removeIntroVideo() async {
    final uid = _fs.uid;
    if (uid == null) throw Exception('Video silinemedi');
    final userData = await _fs.getDoc('users/$uid');
    final url = (userData?['introVideo'] as Map?)?.cast<String, dynamic>()?['url'] as String?;
    if (url != null) {
      try {
        await _fs.storage.refFromURL(url).delete();
      } catch (_) {}
    }
    await _fs.db.doc('users/$uid').set(
      {'introVideo': null, 'updatedAt': _fs.serverNow},
      SetOptions(merge: true),
    );
  }

  Future<List<String>> uploadJobVideos(List<XFile> files) async {
    final uid = _fs.uid ?? 'anon';
    final urls = <String>[];
    for (final xfile in files) {
      final bytes = await xfile.readAsBytes();
      final name =
          '${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
      final ref =
          _fs.storage.ref('jobs/$uid/videos/$name');
      final url = await _upload(ref, bytes, contentType: 'video/mp4');
      urls.add(url);
    }
    return urls;
  }
}
