import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';

/// Center-aligned subtle divider with localized date label.
/// Used between chat messages with 1+ hour delta.
class DateDivider extends StatelessWidget {
  final DateTime date;

  const DateDivider({super.key, required this.date});

  static String formatLabel(DateTime ts) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final msgDay = DateTime(ts.year, ts.month, ts.day);
    final diff = today.difference(msgDay).inDays;

    final hhmm = DateFormat('HH:mm').format(ts);

    if (diff == 0) return 'Bugün $hhmm';
    if (diff == 1) return 'Dün $hhmm';
    if (diff > 1 && diff < 7) {
      return '${DateFormat('EEEE', 'tr_TR').format(ts)} $hhmm';
    }
    return '${DateFormat('d MMMM', 'tr_TR').format(ts)} $hhmm';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 1,
              color: AppColors.border.withValues(alpha: 0.5),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              formatLabel(date),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Container(
              height: 1,
              color: AppColors.border.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}
