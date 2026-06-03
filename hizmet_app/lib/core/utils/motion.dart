import 'package:flutter/material.dart';

/// Phase 391 — Taste calibration helper.
///
/// Emil Kowalski "great animations" 6. prensip: `prefers-reduced-motion`
/// her zaman dikkate alınmalı. Flutter karşılığı `MediaQuery.disableAnimations`
/// (iOS Reduce Motion / Android Accessibility Animation = 0 / sistem ayarı).
///
/// Kullanım:
/// ```dart
/// // Duration
/// AnimatedContainer(duration: Motion.scale(context, 280.ms), ...)
///
/// // Curve (kullanıcı reduce mode'da iken linear yerine zaten kısa süre)
/// Tween().animate(CurvedAnimation(parent: a, curve: Motion.curve(context)))
///
/// // Tam atla
/// if (Motion.reduced(context)) return child;
/// return child.animate().fadeIn();
/// ```
class Motion {
  /// Sistem reduce-motion açık mı?
  /// iOS: Settings → Accessibility → Motion → Reduce Motion
  /// Android: Settings → Accessibility → Remove animations
  static bool reduced(BuildContext context) =>
      MediaQuery.of(context).disableAnimations;

  /// Duration'ı reduce-motion'da sıfırla; aksi halde olduğu gibi döner.
  /// Tek frame anlık geçiş = "atomik state değişimi" hissi (Emil §1 Natural'a
  /// aykırı değil; reduce-motion kullanıcısı için *daha* natural).
  static Duration scale(BuildContext context, Duration d) =>
      reduced(context) ? Duration.zero : d;

  /// Reduce-motion'da easeOutCubic yerine linear (görsel "ovalama" minimum).
  /// Default `Curves.easeOutCubic` — Yapgitsin standardı.
  static Curve curve(BuildContext context,
          [Curve normal = Curves.easeOutCubic]) =>
      reduced(context) ? Curves.linear : normal;

  /// flutter_animate çağrılarını koşullu sarmak için. Reduce-motion'da
  /// `child`'ı doğrudan döndürür, animate() chain bypass.
  ///
  /// Kullanım:
  /// ```dart
  /// return Motion.guard(context, child,
  ///   () => child.animate().fadeIn().slideY());
  /// ```
  static Widget guard(
    BuildContext context,
    Widget child,
    Widget Function() animated,
  ) =>
      reduced(context) ? child : animated();
}
