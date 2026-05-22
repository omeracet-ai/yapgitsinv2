import 'package:flutter/material.dart';

import 'package:hizmet_app/core/theme/app_colors.dart';
// Phase 178 — Worker (usta) map marker. JobMapMarker ile aynı pill+tail
// estetiği; ayırt etmek için mavi vurgu (#0EA5E9) ve kişi ikonu kullanılır.
// Seçili durumda mavi dolgu + scale 1.1.

class WorkerMapMarker extends StatelessWidget {
  final String? name;
  final double? rating;
  final bool isSelected;
  final bool isVerified;
  final bool isApprox;

  const WorkerMapMarker({
    super.key,
    this.name,
    this.rating,
    this.isSelected = false,
    this.isVerified = false,
    this.isApprox = false,
  });

  // Usta pin'i: normal TURUNCU; aktif (seçili) = app accent yeşili (lightheme).
  static const _orange = Color(0xFFF97316);
  static const _active = Color(0xFF4ADE80);

  @override
  Widget build(BuildContext context) {
    final pillBg = isSelected ? _active : _orange;
    const iconColor = Colors.white;
    const textColor = Colors.white;
    final label = rating != null
        ? rating!.toStringAsFixed(1)
        : (name != null && name!.isNotEmpty ? _firstName(name!) : 'Usta');

    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: pillBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: isSelected
                ? const Color(0xFF22C55E)
                : const Color(0xFFC2410C),
            width: 1),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: _active.withValues(alpha: 0.45),
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
          const Icon(Icons.person_pin_rounded, size: 16, color: iconColor),
          const SizedBox(width: 4),
          if (rating != null) ...[
            const Icon(
              Icons.star_rounded,
              size: 11,
              color: Colors.white,
            ),
            const SizedBox(width: 2),
          ],
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );

    // Doğrulanmış usta için mavi tik rozeti (sağ üst).
    final verifiedBadge = Positioned(
      top: -4,
      right: -4,
      child: Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.verifiedBlue,
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
        child: const Icon(
          Icons.check,
          size: 10,
          color: AppColors.verifiedBlue,
        ),
      ),
    );

    final approxBadge = Positioned(
      top: -4,
      left: -4,
      child: Tooltip(
        message: 'Yaklaşık konum',
        child: Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(color: AppColors.surface,
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
            if (isVerified) verifiedBadge,
            if (isApprox) approxBadge,
          ],
        ),
        tail,
      ],
    );

    if (isSelected) {
      marker = Transform.scale(scale: 1.1, child: marker);
    }
    if (isApprox && !isSelected) {
      marker = Opacity(opacity: 0.7, child: marker);
    }
    return marker;
  }

  static String _firstName(String fullName) {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    return parts.isEmpty ? 'Usta' : parts.first;
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
