// Phase 251 — Widget tests for SmsVerifyScreen (Phase 250-B).
//
// Strategy:
//   - Use ProviderScope override on [firebaseAuthRepositoryProvider] to inject
//     a fake repo that records calls and returns stubbed results.
//   - Avoid touching real Firebase / Dio by skipping FirebaseAuthRepository's
//     constructor entirely — we use a [_FakeFirebaseAuthRepository] that
//     `implements` the public surface via Mirrors-free subclassing through
//     `noSuchMethod`.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hizmet_app/features/auth/data/firebase_auth_repository.dart';
import 'package:hizmet_app/features/auth/presentation/screens/sms_verify_screen.dart';

/// Fake repo: only SMS methods are exercised by the screen. Any other
/// call would throw NoSuchMethodError, which makes accidental usage loud.
class _FakeAuthRepo implements FirebaseAuthRepository {
  int requestCalls = 0;
  int verifyCalls = 0;
  String? lastPhone;
  String? lastCode;

  /// If non-null, requestSmsCode throws this.
  Object? requestError;

  /// If non-null, verifySmsCode throws this.
  Object? verifyError;

  Map<String, dynamic> verifyResponse = const {'verified': true};

  @override
  Future<void> requestSmsCode(String phoneNumber) async {
    requestCalls++;
    lastPhone = phoneNumber;
    if (requestError != null) throw requestError!;
  }

  @override
  Future<Map<String, dynamic>> verifySmsCode(
      String phoneNumber, String code) async {
    verifyCalls++;
    lastPhone = phoneNumber;
    lastCode = code;
    if (verifyError != null) throw verifyError!;
    return verifyResponse;
  }

  // Any method we don't override should NOT be touched by SmsVerifyScreen.
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError(
          'Unexpected repo call: ${invocation.memberName}');
}

Widget _wrap(Widget child, _FakeAuthRepo repo) {
  return ProviderScope(
    overrides: [
      firebaseAuthRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp(home: child),
  );
}

void main() {
  testWidgets('renders phone + code inputs and Kod Gönder button',
      (tester) async {
    final repo = _FakeAuthRepo();
    await tester.pumpWidget(_wrap(const SmsVerifyScreen(), repo));
    await tester.pumpAndSettle();

    expect(find.text('Telefon Doğrulama'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Telefon'), findsOneWidget);
    expect(find.text('6 Haneli Kod'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Kod Gönder'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Doğrula'), findsOneWidget);
  });

  testWidgets('empty phone + Kod Gönder shows validation error',
      (tester) async {
    final repo = _FakeAuthRepo();
    await tester.pumpWidget(_wrap(const SmsVerifyScreen(), repo));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'Kod Gönder'));
    await tester.pumpAndSettle();

    // Inline _error banner with the phone validation message.
    expect(find.text('Telefon numarası gerekli'), findsOneWidget);
    expect(repo.requestCalls, 0);
  });

  testWidgets('valid phone → Kod Gönder calls requestSmsCode + enables code',
      (tester) async {
    final repo = _FakeAuthRepo();
    await tester.pumpWidget(_wrap(const SmsVerifyScreen(), repo));
    await tester.pumpAndSettle();

    await tester.enterText(
        find.widgetWithText(TextFormField, 'Telefon'), '+905551234567');
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kod Gönder'));
    await tester.pumpAndSettle();

    expect(repo.requestCalls, 1);
    expect(repo.lastPhone, '+905551234567');
    expect(find.textContaining('Doğrulama kodu telefonunuza gönderildi'),
        findsOneWidget);
    // Button label flips to "Kodu Tekrar Gönder" after first send.
    expect(find.widgetWithText(OutlinedButton, 'Kodu Tekrar Gönder'),
        findsOneWidget);
  });

  testWidgets('after code sent, entering 6-digit code + Doğrula calls verify',
      (tester) async {
    final repo = _FakeAuthRepo();
    await tester.pumpWidget(_wrap(
        const SmsVerifyScreen(initialPhone: '+905551234567'), repo));
    await tester.pumpAndSettle();

    // Trigger send first so the code field is enabled.
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kod Gönder'));
    await tester.pumpAndSettle();

    await tester.enterText(
        find.widgetWithText(TextFormField, '6 Haneli Kod'), '123456');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Doğrula'));
    await tester.pumpAndSettle();

    expect(repo.verifyCalls, 1);
    expect(repo.lastPhone, '+905551234567');
    expect(repo.lastCode, '123456');
  });

  testWidgets('requestSmsCode error surfaces as visible message',
      (tester) async {
    final repo = _FakeAuthRepo()
      ..requestError = Exception('Çok fazla deneme. Lütfen bekleyin.');
    await tester.pumpWidget(_wrap(const SmsVerifyScreen(), repo));
    await tester.pumpAndSettle();

    await tester.enterText(
        find.widgetWithText(TextFormField, 'Telefon'), '+905551234567');
    await tester.tap(find.widgetWithText(OutlinedButton, 'Kod Gönder'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Çok fazla deneme'), findsOneWidget);
    expect(repo.requestCalls, 1);
  });
}
