// Phase 251 — Unit tests for SMS request/verify methods on
// FirebaseAuthRepository. Uses a custom Dio adapter to inject responses
// without hitting the network.
//
// Mock strategy: manual fake adapter (no mocktail/mockito in project).
// Pattern mirrors test/api_client_test.dart.

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_core_platform_interface/firebase_core_platform_interface.dart';
import 'package:firebase_core_platform_interface/test.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hizmet_app/core/network/api_client.dart';
import 'package:hizmet_app/core/services/firebase_auth_service.dart';
import 'package:hizmet_app/features/auth/data/firebase_auth_repository.dart';

/// Adapter that returns a canned response (or DioException) per request.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.handler);

  /// Returns either a Map (decoded body) or throws to simulate DioException.
  final Future<_StubResponse> Function(RequestOptions options) handler;

  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    final r = await handler(options);
    return ResponseBody.fromString(
      r.body,
      r.statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _StubResponse {
  _StubResponse(this.statusCode, this.body);
  final int statusCode;
  final String body;
}

/// Minimal Firebase mock so [FirebaseAuth.instance] in FirebaseAuthService
/// doesn't blow up during construction. The SMS methods never touch
/// `_service`, so this stub is enough.
class _MockFirebaseApp implements TestFirebaseCoreHostApi {
  @override
  Future<CoreInitializeResponse> initializeApp(
    String appName,
    CoreFirebaseOptions initializeAppRequest,
  ) async {
    return CoreInitializeResponse(
      name: appName,
      options: CoreFirebaseOptions(
        apiKey: 'fake',
        projectId: 'fake',
        appId: 'fake',
        messagingSenderId: 'fake',
      ),
      pluginConstants: {},
    );
  }

  @override
  Future<List<CoreInitializeResponse>> initializeCore() async {
    return [
      CoreInitializeResponse(
        name: defaultFirebaseAppName,
        options: CoreFirebaseOptions(
          apiKey: 'fake',
          projectId: 'fake',
          appId: 'fake',
          messagingSenderId: 'fake',
        ),
        pluginConstants: {},
      ),
    ];
  }

  @override
  Future<CoreFirebaseOptions> optionsFromResource() async {
    return CoreFirebaseOptions(
      apiKey: 'fake',
      projectId: 'fake',
      appId: 'fake',
      messagingSenderId: 'fake',
    );
  }
}

void setupFirebaseMocks() {
  TestWidgetsFlutterBinding.ensureInitialized();
  TestFirebaseCoreHostApi.setUp(_MockFirebaseApp());

  // firebase_auth uses MethodChannels for native lookups (e.g. on
  // construction it may probe the current user). Swallow all calls.
  const authChannel =
      MethodChannel('plugins.flutter.io/firebase_auth');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(authChannel, (call) async => null);

  // flutter_secure_storage — ApiClient's AuthInterceptor reads here on
  // every request. Return null (no stored token) so requests proceed.
  const secureStorage =
      MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(secureStorage, (call) async {
    if (call.method == 'read' || call.method == 'readAll') return null;
    if (call.method == 'containsKey') return false;
    return null;
  });
}

/// Build a repo whose internal Dio routes through [adapter]. We skip the
/// real ApiClient wiring by constructing a Dio + ApiClient where the Dio's
/// adapter is overridden. Token storage / interceptors don't matter for
/// these tests because we observe at the adapter layer.
Future<FirebaseAuthRepository> _buildRepo(_StubAdapter adapter) async {
  await Firebase.initializeApp();
  final dio = Dio();
  dio.httpClientAdapter = adapter;
  final api = ApiClient(dio: dio);
  final service = FirebaseAuthService(apiClient: api);
  return FirebaseAuthRepository(service, api);
}

void main() {
  setUpAll(setupFirebaseMocks);

  group('FirebaseAuthRepository.requestSmsCode', () {
    test('200 OK → returns without throwing', () async {
      final adapter = _StubAdapter((_) async => _StubResponse(200, '{}'));
      final repo = await _buildRepo(adapter);

      await repo.requestSmsCode('+905551234567');

      expect(adapter.captured.length, 1);
      final req = adapter.captured.first;
      expect(req.method, 'POST');
      expect(req.path, '/auth/sms/request');
      // Body should contain the phone number.
      final body = req.data is Map
          ? req.data as Map
          : json.decode(req.data as String) as Map;
      expect(body['phoneNumber'], '+905551234567');
    });

    test('400 with backend message → throws Türkçe DTO message', () async {
      final adapter = _StubAdapter(
        (_) async => _StubResponse(
            400, json.encode({'message': 'Telefon numarası geçersiz.'})),
      );
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.requestSmsCode('123'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Telefon numarası geçersiz.'),
          ),
        ),
      );
    });

    test('429 → "Çok fazla deneme. Lütfen bekleyin." throttle message',
        () async {
      final adapter = _StubAdapter((_) async => _StubResponse(429, '{}'));
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.requestSmsCode('+905551234567'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Çok fazla deneme'),
          ),
        ),
      );
    });

    test('500 → generic fallback message', () async {
      final adapter = _StubAdapter((_) async => _StubResponse(500, '{}'));
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.requestSmsCode('+905551234567'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Sunucu hatası'),
          ),
        ),
      );
    });
  });

  group('FirebaseAuthRepository.verifySmsCode', () {
    test('200 OK → returns body Map', () async {
      final adapter = _StubAdapter(
        (_) async => _StubResponse(
            200, json.encode({'verified': true, 'phone': '+905551234567'})),
      );
      final repo = await _buildRepo(adapter);

      final res =
          await repo.verifySmsCode('+905551234567', '123456');

      expect(res['verified'], true);
      expect(res['phone'], '+905551234567');
      final req = adapter.captured.first;
      expect(req.path, '/auth/sms/verify');
      final body = req.data is Map
          ? req.data as Map
          : json.decode(req.data as String) as Map;
      expect(body['phoneNumber'], '+905551234567');
      expect(body['code'], '123456');
    });

    test('400 with backend message → DTO message bubbles up', () async {
      final adapter = _StubAdapter(
        (_) async => _StubResponse(
            400, json.encode({'message': 'Kod 6 haneli olmalı'})),
      );
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.verifySmsCode('+905551234567', '12'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Kod 6 haneli olmalı'),
          ),
        ),
      );
    });

    test('401 → "Kod hatalı veya süresi dolmuş" specific message',
        () async {
      final adapter = _StubAdapter((_) async => _StubResponse(401, '{}'));
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.verifySmsCode('+905551234567', '000000'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Kod hatalı veya süresi dolmuş'),
          ),
        ),
      );
    });

    test('429 → throttle message', () async {
      final adapter = _StubAdapter((_) async => _StubResponse(429, '{}'));
      final repo = await _buildRepo(adapter);

      await expectLater(
        () => repo.verifySmsCode('+905551234567', '123456'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Çok fazla deneme'),
          ),
        ),
      );
    });
  });
}
