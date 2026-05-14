import 'package:flutter/material.dart';

// Airtasker-style bubble pin marker for map.
// Shape: white pill with shadow + downward triangle tail.
// Selected state: blue fill, stronger shadow, scale 1.1 + "Y" logo badge.

class JobMapMarker extends StatelessWidget {
  final String category;
  final bool isSelected;
  final String? price; // e.g. "250" or null

  const JobMapMarker({
    super.key,
    required this.category,
    this.isSelected = false,
    this.price,
  });

  static const _blue = Color(0xFF007DFE);

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
    final pillBg = isSelected ? _blue : Colors.white;
    final iconColor = isSelected ? Colors.white : _blue;
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
                  color: _blue.withValues(alpha: 0.45),
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

    // "Y" badge shown when selected
    final badge = Positioned(
      top: -3,
      right: -3,
      child: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: _blue,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1),
        ),
        alignment: Alignment.center,
        child: const Text(
          'Y',
          style: TextStyle(
            fontSize: 7,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            height: 1,
          ),
        ),
      ),
    );

    final tail = CustomPaint(
      size: const Size(8, 6),
      painter: _TailPainter(color: pillBg, hasBorder: !isSelected),
    );

    Widget marker = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            pill,
            if (isSelected) badge,
          ],
        ),
        tail,
      ],
    );

    if (isSelected) {
      marker = Transform.scale(scale: 1.1, child: marker);
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
