import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';

// Phase 272 — 3D pin marker. Eski 18px düz daire yerine teardrop-shaped pin:
// elliptical ground shadow + gradient body + üst highlight + alt sivri uç.
// Selected/featured durumlarında scale ve glow artar.
//
// Boyut: 44 × 56 (default). `isApprox=true` ise 0.55 opacity + üst-sol "~"
// badge, mevcut JobMapMarker davranışıyla parity korunur.
class JobPinMarker extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool isSelected;
  final bool isFeatured;
  final bool isApprox;
  final VoidCallback onTap;

  const JobPinMarker({
    super.key,
    required this.icon,
    required this.onTap,
    this.color = AppColors.primary,
    this.isSelected = false,
    this.isFeatured = false,
    this.isApprox = false,
  });

  @override
  Widget build(BuildContext context) {
    final scale = isSelected ? 1.15 : 1.0;
    final pinW = 40.0 * scale;
    final pinH = 52.0 * scale;
    final pin = SizedBox(
      width: pinW,
      height: pinH,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          // ── Ground shadow (elliptical, blurred) ──
          Positioned(
            bottom: 0,
            child: Container(
              width: pinW * 0.55,
              height: 6,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.30),
                borderRadius: BorderRadius.circular(8),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x55000000),
                    blurRadius: 6,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),
          // ── Pin tip (downward triangle) ──
          Positioned(
            bottom: 4,
            child: CustomPaint(
              size: Size(pinW * 0.32, pinH * 0.30),
              painter: _PinTipPainter(
                color: color,
                shadow: color.withValues(alpha: 0.5),
              ),
            ),
          ),
          // ── Pin head (gradient circle w/ inner highlight) ──
          Positioned(
            top: 0,
            child: Transform(
              alignment: Alignment.center,
              // Subtle perspective tilt for 3D feel.
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateX(0.10),
              child: Container(
                width: pinW * 0.85,
                height: pinW * 0.85,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color.lerp(color, Colors.white, 0.35)!,
                      color,
                      Color.lerp(color, Colors.black, 0.25)!,
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.9),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(
                          alpha: isSelected ? 0.65 : (isFeatured ? 0.55 : 0.35)),
                      blurRadius: isSelected ? 16 : 10,
                      spreadRadius: isSelected ? 1.5 : 0.5,
                    ),
                    const BoxShadow(
                      color: Color(0x66000000),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Top-left inner glossy highlight
                    Positioned(
                      top: 3,
                      left: 5,
                      child: Container(
                        width: pinW * 0.22,
                        height: pinW * 0.14,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    Icon(
                      icon,
                      color: Colors.white,
                      size: pinW * 0.40,
                    ),
                  ],
                ),
              ),
            ),
          ),
          // ── Featured star badge (top-right) ──
          if (isFeatured)
            Positioned(
              top: -2,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(
                  color: Color(0xFFFFC542),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x66000000),
                      blurRadius: 3,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                child: const Icon(Icons.star_rounded,
                    size: 10, color: Colors.white),
              ),
            ),
        ],
      ),
    );

    Widget body = AnimatedScale(
      scale: scale,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,
      child: Opacity(opacity: isApprox ? 0.55 : 1.0, child: pin),
    );

    // Approx "~" badge (top-left), JobMapMarker ile aynı görsel dilde.
    if (isApprox) {
      body = SizedBox(
        width: pinW + 6,
        height: pinH + 6,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(left: 3, top: 3, child: body),
            Positioned(
              top: 0,
              left: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: const Color(0xFF6B7280), width: 1.5),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x40000000),
                      blurRadius: 2,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: const Text(
                  '~',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF4B5563),
                    height: 1,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: body,
    );
  }
}

class _PinTipPainter extends CustomPainter {
  final Color color;
  final Color shadow;

  _PinTipPainter({required this.color, required this.shadow});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawShadow(path, shadow, 3, false);
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color,
          Color.lerp(color, Colors.black, 0.35)!,
        ],
      ).createShader(Offset.zero & size);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _PinTipPainter oldDelegate) =>
      oldDelegate.color != color;
}
