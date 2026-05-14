import 'package:flutter/material.dart';

class JobMapMarker extends StatelessWidget {
  final String category;
  final bool isSelected;

  const JobMapMarker({
    super.key,
    required this.category,
    this.isSelected = false,
  });

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
    final color = isSelected ? const Color(0xFF007DFE) : const Color(0xFFFFA000);
    final size = isSelected ? 36.0 : 28.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.4),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(
            _iconFor(category),
            color: Colors.white,
            size: size * 0.5,
          ),
        ),
        CustomPaint(
          size: const Size(8, 5),
          painter: _TailPainter(color: color),
        ),
      ],
    );
  }
}

class _TailPainter extends CustomPainter {
  final Color color;
  const _TailPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_TailPainter old) => old.color != color;
}
