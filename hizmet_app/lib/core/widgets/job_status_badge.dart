import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum JobStatus { open, inProgress, completed, cancelled }

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
      'OPEN' || 'AÇIK' => JobStatus.open,
      'IN_PROGRESS' || 'ASSIGNED' || 'ATANDI' => JobStatus.inProgress,
      'COMPLETED' || 'TAMAMLANDI' => JobStatus.completed,
      'CANCELLED' || 'İPTAL' => JobStatus.cancelled,
      _ => JobStatus.open,
    };
    return JobStatusBadge(status: s, fontSize: fontSize);
  }

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      JobStatus.open => ('Açık', const Color(0xFFE8FFF5), AppColors.success),
      JobStatus.inProgress => (
          'Atandı',
          const Color(0xFFE5F2FF),
          AppColors.primary
        ),
      JobStatus.completed => (
          'Tamamlandı',
          const Color(0xFFF3F4F6),
          AppColors.textSecondary
        ),
      JobStatus.cancelled => (
          'İptal',
          const Color(0xFFFFECEA),
          AppColors.error
        ),
    };

    return Container(
      padding: EdgeInsets.symmetric(horizontal: fontSize + 1, vertical: fontSize * 0.4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
