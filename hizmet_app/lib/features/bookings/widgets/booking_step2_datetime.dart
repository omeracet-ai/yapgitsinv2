import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';

class BookingStep2DateTime extends StatelessWidget {
  final DateTime? scheduledDate;
  final TimeOfDay? scheduledTime;
  final ValueChanged<DateTime?> onDateChanged;
  final ValueChanged<TimeOfDay?> onTimeChanged;

  const BookingStep2DateTime({
    super.key,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.onDateChanged,
    required this.onTimeChanged,
  });

  Future<void> _pickDate(BuildContext context) async {
    final now = DateTime.now();
    final first = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
    final last = first.add(const Duration(days: 90));
    final picked = await showDatePicker(
      context: context,
      initialDate: scheduledDate ?? first,
      firstDate: first,
      lastDate: last,
      helpText: 'Randevu tarihi seç',
      cancelText: 'İptal',
      confirmText: 'Tamam',
    );
    if (picked != null) onDateChanged(picked);
  }

  Future<void> _pickTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: scheduledTime ?? const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Randevu saati seç',
      cancelText: 'İptal',
      confirmText: 'Tamam',
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) onTimeChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('d MMMM yyyy, EEEE', 'tr_TR');
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tarih & Saat',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Ne zaman gelmesini istiyorsunuz?',
              style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 24),
          _PickerCard(
            icon: Icons.calendar_today_rounded,
            label: 'Tarih *',
            value: scheduledDate == null ? 'Tarih seç' : df.format(scheduledDate!),
            isSet: scheduledDate != null,
            onTap: () => _pickDate(context),
          ),
          const SizedBox(height: 12),
          _PickerCard(
            icon: Icons.access_time_rounded,
            label: 'Saat (opsiyonel)',
            value: scheduledTime == null
                ? 'Saat seç'
                : '${scheduledTime!.hour.toString().padLeft(2, '0')}:${scheduledTime!.minute.toString().padLeft(2, '0')}',
            isSet: scheduledTime != null,
            onTap: () => _pickTime(context),
            trailing: scheduledTime == null
                ? null
                : IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => onTimeChanged(null),
                  ),
          ),
        ],
      ),
    );
  }
}

class _PickerCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isSet;
  final VoidCallback onTap;
  final Widget? trailing;
  const _PickerCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.isSet,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isSet
                              ? AppColors.textPrimary
                              : AppColors.textHint)),
                ],
              ),
            ),
            if (trailing != null) trailing! else const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}
