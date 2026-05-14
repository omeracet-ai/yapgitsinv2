import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';

/// XFile → sıkıştırılmış Uint8List. Web + mobile uyumlu.
Future<Uint8List> compressImage(
  XFile xfile, {
  int quality = 75,
  int maxWidth = 1280,
}) async {
  final bytes = await xfile.readAsBytes();
  if (kIsWeb) {
    final result = await FlutterImageCompress.compressWithList(
      bytes,
      quality: quality,
      minWidth: 100,
      minHeight: 100,
    );
    return result;
  }
  final result = await FlutterImageCompress.compressWithList(
    bytes,
    quality: quality,
    minWidth: maxWidth,
  );
  return result;
}

/// Video boyut filtresi — 50MB üstü false döner.
Future<bool> validateVideoSize(XFile xfile, {int maxMb = 50}) async {
  final bytes = await xfile.length();
  return bytes <= maxMb * 1024 * 1024;
}
