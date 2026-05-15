import 'package:flutter/material.dart';

// Airtasker-style bubble pin marker for map.
// Shape: white pill with shadow + downward triangle tail.
// Selected state: blue fill, stronger shadow, scale 1.1 + "Y" logo badge.

class JobMapMarker extends StatelessWidget {
  final String category;
  final bool isSelected;
  final String? price; // e.g. "250" or null
  // Phase 152 — Yaklaşık konum (city-centroid backfill). True ise pin yarı
  // saydam ve sağ alt köşede "~" rozeti gösterilir.
  final bool isApprox;

  const JobMapMarker({
    super.key,
    required this.category,
    this.isSelected = false,
    this.price,
    this.isApprox = false,
  });

  // Map marker palette — local-only (brand artık yeşil; harita için kontrast).
  static const _blue = Color(0xFF007DFE);
  static const _orange = Color(0xFFFF5E14);

  static IconData _iconFor(String category) {
    switch (category) {
      case 'Elektrikçi':
        return Icons.bolt_rounded;
      case 'Tesisat':
        return Icons.plumbing_rounded;
      case 'Temizlik':
        return Icons.cleaning_services_rounded;
      case 'Boya & Badana':
        return Icons.format_paint_rounded;
      case 'Nakliyat':
        return Icons.local_shipping_rounded;
      default:
        return Icons.build_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pillBg = isSelected ? _orange : Colors.white;
    final iconColor = isSelected ? Colors.white : _orange;
    final textColor = isSelected ? Colors.white : const Color(0xFF1A1A2E);
    final priceLabel = (price != null && price!.isNotEmpty) ? '₺$price' : '?';

    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: pillBg,
        borderRadius: BorderRadius.circular(20),
        border: isSelected
            ? null
            : Border.all(color: const Color(0xFFDDE3EC), width: 1),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: _orange.withValues(alpha: 0.45),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : [
                const BoxShadow(
                  color: Color(0x22000000),
                  blurRadius: 6,
                  offset: Offset(0, 2),
                ),
              ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_iconFor(category), size: 16, color: iconColor),
          const SizedBox(width: 4),
          Text(
            priceLabel,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );

    // "Y" Yapgitsin logo badge — always visible
    final badge = Positioned(
      top: -4,
      right: -4,
      child: Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : _orange,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? _orange : Colors.white,
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Text(
          'Y',
          style: TextStyle(
            fontSize: 8,
            fontWeight: FontWeight.bold,
            color: isSelected ? _orange : Colors.white,
            height: 1,
          ),
        ),
      ),
    );

    final tail = CustomPaint(
      size: const Size(8, 6),
      painter: _TailPainter(color: pillBg, hasBorder: !isSelected),
    );

    // Yaklaşık konum ikinci rozeti (sol üst). Kullanıcının "burası tam değil,
    // şehir merkezi" anlayabilmesi için sade bir "~" işareti.
    final approxBadge = Positioned(
      top: -4,
      left: -4,
      child: Tooltip(
        message: 'Yaklaşık konum',
        child: Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFF6B7280), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: const Text(
            '~',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF6B7280),
              height: 1,
            ),
          ),
        ),
      ),
    );

    Widget marker = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            pill,
            badge,
            if (isApprox) approxBadge,
          ],
        ),
        tail,
      ],
    );

    if (isSelected) {
      marker = Transform.scale(scale: 1.1, child: marker);
    }

    // Yaklaşık konum görsel ipucu: pin yarı saydam (alpha 0.7) — kullanıcı
    // hassasiyet eksikliğini hemen sezsin.
    if (isApprox && !isSelected) {
      marker = Opacity(opacity: 0.7, child: marker);
    }

    return marker;
  }
}

class _TailPainter extends CustomPainter {
  final Color color;
  final bool hasBorder;

  const _TailPainter({required this.color, this.hasBorder = false});

  @override
  void paint(Canvas canvas, Size size) {
    final fillPaint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();

    if (hasBorder) {
      final borderPaint = Paint()
        ..color = const Color(0xFFDDE3EC)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1;
      canvas.drawPath(path, borderPaint);
    }
    canvas.drawPath(path, fillPaint);
  }

  @override
  bool shouldRepaint(_TailPainter old) =>
      old.color != color || old.hasBorder != hasBorder;
}
