import 'package:flutter/material.dart';

// Phase 254 — Admin map parity. AdminMap.tsx (admin-panel) görselini birebir
// taşı: 18x18 circle, 3px border, BoxShadow 0,2,6,rgba(0,0,0,0.35).
// Renkler: orange (#f97316 / border #c2410c), blue (#2563eb / border #1d4ed8).
// Yaklaşık konum (locationApprox=true): opacity 0.55 + sol üst "~" badge
// (14x14 white circle, gri border, gri "~").
class JobMapMarker extends StatelessWidget {
  final String category; // kept for API compatibility (unused in circle pin)
  final bool isSelected;
  final String? price; // kept for API compatibility (unused in circle pin)
  final bool isApprox;

  const JobMapMarker({
    super.key,
    required this.category,
    this.isSelected = false,
    this.price,
    this.isApprox = false,
  });

  // İlan pin'i: normal MAVİ; aktif (seçili) = app accent yeşili (lightheme).
  static const _blueBg = Color(0xFF2563EB);
  static const _blueBorder = Color(0xFF1D4ED8);
  static const _activeBg = Color(0xFF4ADE80);
  static const _activeBorder = Color(0xFF22C55E);

  @override
  Widget build(BuildContext context) {
    final bg = isSelected ? _activeBg : _blueBg;
    final border = isSelected ? _activeBorder : _blueBorder;
    final opacity = isApprox ? 0.55 : 1.0;

    final circle = Opacity(
      opacity: opacity,
      child: Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: bg,
          shape: BoxShape.circle,
          border: Border.all(color: border, width: 3),
          boxShadow: const [
            BoxShadow(
              color: Color(0x59000000), // rgba(0,0,0,0.35)
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
      ),
    );

    if (!isApprox) {
      return Center(child: circle);
    }

    // ~ badge (top-left)
    return Center(
      child: SizedBox(
        width: 28,
        height: 28,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 5,
              top: 5,
              child: circle,
            ),
            Positioned(
              top: 0,
              left: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: const Color(0xFF6B7280), width: 1.5),
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
      ),
    );
  }
}
