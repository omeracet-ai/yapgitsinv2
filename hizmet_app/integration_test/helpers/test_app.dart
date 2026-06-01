// Phase 357 — Integration test helpers.
//
// Tek noktadan `ProviderScope + YapgitsinApp` mount eder ve test'lerin
// kullanabileceği sık-kullanım extension'ları sağlar.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:hizmet_app/main.dart' as app;

/// Test başlangıcında app'ı boot et + ilk frame'i yerleştir.
Future<void> bootApp(WidgetTester tester) async {
  app.main();
  // pumpAndSettle 60s'e kadar bekler — splash + asset load için cömert.
  await tester.pumpAndSettle(const Duration(seconds: 30));
}

extension TesterX on WidgetTester {
  /// Find + tap shorthand; ardından pumpAndSettle.
  Future<void> tapKey(String keyValue) async {
    final f = find.byKey(Key(keyValue));
    expect(f, findsOneWidget,
        reason: 'Key("$keyValue") DOM\'da bulunamadı');
    await tap(f);
    await pumpAndSettle();
  }

  /// Bir text field'a yaz; ardından klavyeyi kapat.
  Future<void> enterByKey(String keyValue, String text) async {
    final f = find.byKey(Key(keyValue));
    expect(f, findsOneWidget);
    await enterText(f, text);
    await pumpAndSettle();
  }

  /// Pump + wait until specific text/widget appears or timeout.
  Future<bool> waitFor(Finder f,
      {Duration timeout = const Duration(seconds: 8)}) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await pump(const Duration(milliseconds: 300));
      if (f.evaluate().isNotEmpty) return true;
    }
    return false;
  }
}
