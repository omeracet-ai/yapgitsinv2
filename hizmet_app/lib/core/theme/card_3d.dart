import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Sıkılaştırılmış 3D efekti veren BoxDecoration üreticisi.
///
/// Bileşenler (sade, agresif değil):
/// - Diagonal gradient (üst-sol biraz aydınlık, alt-sağ biraz koyu) → derinlik
/// - 2-katman shadow: large ambient + tight key (alt-sağa kayık)
/// - 1px iç highlight üst kenarda → "kalkık" hissi
/// - 1px düşük-alpha border
///
/// Dark & light için ayrı tonlar; theme-aware (AppColors getters).
///
/// Kullanım:
/// ```dart
/// Container(decoration: card3d(context), child: ...)
/// // Veya elevation override:
/// Container(decoration: card3d(context, elevation: 1.5))
/// ```
BoxDecoration card3d(
  BuildContext context, {
  double radius = 14,
  double elevation = 1.0,
  Color? tint,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final base = tint ?? AppColors.surface;

  // Gradient: aynı renk ama üst hafif daha açık (alpha overlay)
  final topOverlay = (isDark ? Colors.white : Colors.white).withValues(
    alpha: isDark ? 0.04 : 0.6,
  );
  final bottomOverlay = (isDark ? Colors.black : const Color(0xFFE2E6EB))
      .withValues(alpha: isDark ? 0.10 : 0.45);

  return BoxDecoration(
    borderRadius: BorderRadius.circular(radius),
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color.alphaBlend(topOverlay, base),
        base,
        Color.alphaBlend(bottomOverlay, base),
      ],
      stops: const [0.0, 0.55, 1.0],
    ),
    border: Border.all(
      color: isDark
          ? Colors.white.withValues(alpha: 0.06)
          : Colors.black.withValues(alpha: 0.06),
      width: 0.6,
    ),
    boxShadow: [
      // Ambient — yumuşak yayılım
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.40)
            : Colors.black.withValues(alpha: 0.06),
        blurRadius: 18 * elevation,
        spreadRadius: 0,
        offset: Offset(0, 4 * elevation),
      ),
      // Key — daha sıkı, yön belirgin
      BoxShadow(
        color: isDark
            ? Colors.black.withValues(alpha: 0.22)
            : Colors.black.withValues(alpha: 0.03),
        blurRadius: 4 * elevation,
        spreadRadius: 0,
        offset: Offset(0, 1.5 * elevation),
      ),
    ],
  );
}

/// `card3d` ile aynı look'u bir Container etrafında uygulayan yardımcı widget.
/// Inner highlight çizgisini ClipRRect + Stack ile basabilir; lokal kullanım.
class Card3D extends StatelessWidget {
  final Widget child;
  final double radius;
  final double elevation;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? tint;
  final VoidCallback? onTap;

  const Card3D({
    super.key,
    required this.child,
    this.radius = 14,
    this.elevation = 1.0,
    this.padding,
    this.margin,
    this.tint,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inner = Stack(
      children: [
        Padding(
          padding: padding ?? EdgeInsets.zero,
          child: child,
        ),
        // Üst iç highlight — 1px ince çizgi
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          child: Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  (isDark ? Colors.white : Colors.white).withValues(
                    alpha: isDark ? 0.10 : 0.85,
                  ),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );

    final shell = Container(
      margin: margin,
      decoration: card3d(
        context,
        radius: radius,
        elevation: elevation,
        tint: tint,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: inner,
      ),
    );

    if (onTap == null) return shell;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: shell,
      ),
    );
  }
}
