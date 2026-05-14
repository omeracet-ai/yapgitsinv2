import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';

/// XFile → sıkıştırılmış Uint8List. Web + mobile uyumlu.
/// Web'de flutter_image_compress platform channel çalışmadığından
/// raw bytes döner — backend zaten processImage ile optimize eder.
Future<Uint8List> compressImage(
  XFile xfile, {
  int quality = 75,
  int maxWidth = 1280,
}) async {
  final bytes = await xfile.readAsBytes();
  if (kIsWeb) return bytes;
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
