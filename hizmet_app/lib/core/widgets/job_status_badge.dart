import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum JobStatus { open, inProgress, completed, cancelled }

/// Premium Dark Soft status pill â€” temp3.jpg style.
/// YeÅŸil/sarÄ±/gri/kÄ±rmÄ±zÄ± renk mapping; soft tint + ince border.
class JobStatusBadge extends StatelessWidget {
  final JobStatus status;
  final double fontSize;

  const JobStatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  factory JobStatusBadge.fromString(String? raw, {double fontSize = 11}) {
    final s = switch ((raw ?? '').toUpperCase()) {
      'OPEN' || 'AÃ‡IK' || 'YENÄ°' => JobStatus.open,
      'IN_PROGRESS' || 'ASSIGNED' || 'ATANDI' || 'BEKLÄ°YOR' =>
        JobStatus.inProgress,
      'COMPLETED' || 'TAMAMLANDI' => JobStatus.completed,
      'CANCELLED' || 'Ä°PTAL' => JobStatus.cancelled,
      _ => JobStatus.open,
    };
    return JobStatusBadge(status: s, fontSize: fontSize);
  }

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      JobStatus.open       => ('YENÄ°',       AppColors.statusOpen),
      JobStatus.inProgress => ('BEKLÄ°YOR',   AppColors.statusPending),
      JobStatus.completed  => ('TAMAMLANDI', AppColors.statusClosed),
      JobStatus.cancelled  => ('Ä°PTAL',      AppColors.statusError),
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: fontSize + 2,
        vertical: fontSize * 0.4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: color.withValues(alpha: 0.30), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          color: color,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

/// Ã‡evrimiÃ§i rozeti (temp1.jpg "â— 12.483 usta ÅŸu an Ã§evrimiÃ§i" stili).
class OnlineCountBadge extends StatelessWidget {
  final String text;
  const OnlineCountBadge({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
