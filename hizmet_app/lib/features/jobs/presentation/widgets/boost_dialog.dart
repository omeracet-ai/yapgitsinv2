import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/job_repository.dart';

class BoostDialog extends ConsumerStatefulWidget {
  final String jobId;
  const BoostDialog({super.key, required this.jobId});

  static Future<bool?> show(BuildContext context, String jobId) {
    return showDialog<bool>(
      context: context,
      builder: (_) => BoostDialog(jobId: jobId),
    );
  }

  @override
  ConsumerState<BoostDialog> createState() => _BoostDialogState();
}

class _BoostDialogState extends ConsumerState<BoostDialog> {
  int _days = 7;
  bool _loading = false;

  static const _options = [
    (3, 30),
    (7, 70),
    (14, 140),
  ];

  Future<void> _confirm() async {
    setState(() => _loading = true);
    try {
      await ref.read(jobRepositoryProvider).boostJob(widget.jobId, _days);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('İlanın öne çıkarıldı 🚀')),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      String msg = 'İlan öne çıkarılamadı.';
      if (e is DioException) {
        final m = e.response?.data is Map ? e.response?.data['message'] : null;
        if (m != null) msg = m.toString();
      } else {
        msg = e.toString().replaceFirst('Exception: ', '');
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('🚀 İlanını Öne Çıkar'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Daha fazla teklif almak için ilanı öne çıkar.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 12),
          for (final opt in _options)
            RadioListTile<int>(
              dense: true,
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.primary,
              value: opt.$1,
              // ignore: deprecated_member_use
              groupValue: _days,
              // ignore: deprecated_member_use
              onChanged: _loading ? null : (v) => setState(() => _days = v!),
              title: Text('${opt.$1} gün'),
              subtitle: Text('${opt.$2} token'),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _loading ? null : () => Navigator.of(context).pop(false),
          child: const Text('İptal'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          onPressed: _loading ? null : _confirm,
          child: _loading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Onayla'),
        ),
      ],
    );
  }
}
