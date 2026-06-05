import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';

/// Phase 433 — İnce yatay puan göstergesi.
///
/// 0-5 arası averageRating değerini dolgu rengi olarak gösterir.
/// Metin/label YOK. Sadece renk + dolgu oranı.
///
/// Renk skalası:
///   0.0-2.0  → kırmızı  (AppColors.error)
///   2.0-3.0  → turuncu  (AppColors.accent)
///   3.0-4.0  → sarı     (AppColors.warning)
///   4.0-5.0  → yeşil    (AppColors.success)
///
/// Mount'ta 600ms ease-out grow animasyonu.
class RatingProgressBar extends StatelessWidget {
  final double rating;
  final double height;
  final EdgeInsetsGeometry padding;

  const RatingProgressBar({
    super.key,
    required this.rating,
    this.height = 5,
    this.padding = EdgeInsets.zero,
  });

  Color _colorFor(double r) {
    if (r < 2.0) return AppColors.error;
    if (r < 3.0) return AppColors.accent;
    if (r < 4.0) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final pct = (rating.clamp(0.0, 5.0)) / 5.0;
    final color = _colorFor(rating);
    return Padding(
      padding: padding,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(height),
        child: SizedBox(
          height: height,
          child: LayoutBuilder(
            builder: (context, c) {
              final fullWidth = c.maxWidth;
              return Stack(
                children: [
                  // Track (arka plan)
                  Container(
                    width: fullWidth,
                    height: height,
                    color: AppColors.border.withValues(alpha: 0.35),
                  ),
                  // Fill (rating oranı)
                  Container(
                    width: fullWidth * pct,
                    height: height,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          AppColors.error,
                          AppColors.accent,
                          AppColors.warning,
                          AppColors.success,
                        ],
                        stops: const [0.0, 0.4, 0.7, 1.0],
                      ),
                      color: color,
                    ),
                  )
                      .animate()
                      .scaleX(
                        begin: 0,
                        end: 1,
                        alignment: Alignment.centerLeft,
                        duration: 600.ms,
                        curve: Curves.easeOutCubic,
                      ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
