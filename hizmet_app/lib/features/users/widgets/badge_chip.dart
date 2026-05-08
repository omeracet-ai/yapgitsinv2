import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Single badge chip — emoji icon + label.
class BadgeChip extends StatelessWidget {
  final String? icon;
  final String label;
  final bool small;

  const BadgeChip({
    super.key,
    required this.label,
    this.icon,
    this.small = false,
  });

  @override
  Widget build(BuildContext context) {
    final fontSize = small ? 10.5 : 12.0;
    final iconSize = small ? 11.0 : 13.0;
    final hPad = small ? 7.0 : 9.0;
    final vPad = small ? 3.0 : 5.0;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null && icon!.isNotEmpty) ...[
            Text(icon!, style: TextStyle(fontSize: iconSize)),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
