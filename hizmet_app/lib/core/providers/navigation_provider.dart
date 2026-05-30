import 'package:flutter_riverpod/flutter_riverpod.dart';

final selectedTabProvider = StateProvider<int>((ref) => 0);

/// Phase 292b — Geçici override: "Hızlı Hizmet Verenlere Ulaş" CTA'sından
/// Harita sekmesine gelen müşterilerin, normalde gizli olan usta pin'lerini
/// bu oturumda görmesini sağlar. MapScreen Harita sekmesinden ayrılınca
/// otomatik olarak false'a düşer (ref.listen → selectedTabProvider).
final mapShowWorkersOverrideProvider = StateProvider<bool>((ref) => false);
