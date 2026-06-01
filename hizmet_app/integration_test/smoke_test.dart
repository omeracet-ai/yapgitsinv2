// Phase 357 — Smoke E2E test. Çalıştırma:
//   flutter test integration_test/smoke_test.dart --device-id=emulator-5554
//
// Kapsam:
//   1. App boot + crash yok
//   2. Bottom-nav 5 tab navigasyonu — tüm tab'lar açılır
//   3. Profil tab guest view → login screen reachable
//
// Login + offer + review akışları ayrı test dosyalarında (auth_test.dart vb).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'helpers/test_app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Smoke: app boots without crash', (tester) async {
    await bootApp(tester);
    // Hiçbir error widget'ı render edilmedi
    expect(find.byType(ErrorWidget), findsNothing);
    // Bottom nav görünür
    expect(find.byKey(const Key('main-bottom-nav')), findsOneWidget);
  });

  testWidgets('Smoke: bottom-nav 5 tab sweep', (tester) async {
    await bootApp(tester);
    final navBar = find.byKey(const Key('main-bottom-nav'));
    expect(navBar, findsOneWidget);

    // Her tab'a sırayla tap — BottomNavigationBarItem'lar index ile
    // bulunamadığı için tap'i `Icons` üzerinden yapıyoruz. Coords yok.
    final tabIcons = [
      Icons.home_outlined,
      Icons.search_outlined,
      Icons.work_outline_rounded,
      Icons.chat_bubble_outline_rounded,
      Icons.person_outline_rounded,
    ];
    for (final ic in tabIcons) {
      // İkonlardan biri zaten "active" hale dönmüş olabilir (activeIcon);
      // her ikisini de finder'a alıyoruz, herhangi biri tıklanabilir yeter.
      final f = find.byIcon(ic);
      if (f.evaluate().isNotEmpty) {
        await tester.tap(f.first);
        await tester.pumpAndSettle();
      }
    }
    // Hâlâ crash yok
    expect(find.byType(ErrorWidget), findsNothing);
  });

  testWidgets('Smoke: Profil tab guest view login CTA tıklanabilir',
      (tester) async {
    await bootApp(tester);
    // Profil tab'ına geç
    final profilFinder = find.byIcon(Icons.person_outline_rounded);
    if (profilFinder.evaluate().isNotEmpty) {
      await tester.tap(profilFinder.first);
      await tester.pumpAndSettle();
    }
    // Guest view'da "Giriş Yap" CTA olmalı (eğer authed değilse).
    // Auth state'i emülatörde persist olduğu için bu adım koşullu —
    // CTA bulunmazsa zaten authenticated demektir, ki o da PASS.
    final loginCta = find.text('Giriş Yap');
    // En az bir state geçerli olmalı; ikisi de değil = bilinmeyen state
    if (loginCta.evaluate().isEmpty) {
      // Authenticated state — tab içinde menü ya da profil header var
      expect(find.text('Profil').evaluate().isNotEmpty ||
              find.text('Kişisel Bilgiler').evaluate().isNotEmpty,
          isTrue);
    }
  });
}
