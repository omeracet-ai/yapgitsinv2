import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../jobs/presentation/screens/job_opportunities_screen.dart';

/// Yapgitsin sekmesi — sadeleştirildi (2026-05-26):
/// Top header (AppBar + "Hizmet İlanı Ver" CTA) kullanıcı isteği ile
/// kaldırıldı. Sekme artık doğrudan ilan listesini (eski "Fırsatlar",
/// güncel adıyla "Yapgitsin" içeriği) gösterir.
class HizmetAlScreen extends ConsumerWidget {
  const HizmetAlScreen({super.key, this.appBarTitle});

  /// Geriye uyumluluk için tutulan parametre; artık kullanılmıyor (header yok).
  final String? appBarTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const Scaffold(
      body: SafeArea(child: JobOpportunitiesBody()),
    );
  }
}
