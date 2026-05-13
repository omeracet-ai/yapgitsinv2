import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hizmet_app/core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Captures the request options the auth interceptor produces, then short-
/// circuits the request so no network call happens.
class _CaptureAdapter implements HttpClientAdapter {
  RequestOptions? captured;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured = options;
    return ResponseBody.fromString('{}', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiClient auth interceptor', () {
    test('adds Bearer header when auth_token is present', () async {
      SharedPreferences.setMockInitialValues({'auth_token': 'abc123'});
      final prefs = await SharedPreferences.getInstance();

      final dio = Dio();
      final adapter = _CaptureAdapter();
      dio.httpClientAdapter = adapter;

      ApiClient(dio: dio, prefs: prefs);

      await dio.get<dynamic>('/ping');

      expect(adapter.captured, isNotNull);
      expect(
        adapter.captured!.headers['Authorization'],
        equals('Bearer abc123'),
      );
    });

    test('omits Authorization header when no token stored', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final dio = Dio();
      final adapter = _CaptureAdapter();
      dio.httpClientAdapter = adapter;

      ApiClient(dio: dio, prefs: prefs);

      await dio.get<dynamic>('/ping');

      expect(adapter.captured, isNotNull);
      expect(
        adapter.captured!.headers.containsKey('Authorization'),
        isFalse,
      );
    });
  });
}
