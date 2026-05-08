import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/moderation_repository.dart';

/// Bottom sheet to file a user report. Backend reasons:
/// spam | harassment | fake_profile | inappropriate_content | other
class ReportUserSheet extends ConsumerStatefulWidget {
  final String userId;
  final String userName;

  const ReportUserSheet({
    super.key,
    required this.userId,
    required this.userName,
  });

  static Future<void> show(
    BuildContext context, {
    required String userId,
    required String userName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ReportUserSheet(userId: userId, userName: userName),
    );
  }

  @override
  ConsumerState<ReportUserSheet> createState() => _ReportUserSheetState();
}

class _ReportUserSheetState extends ConsumerState<ReportUserSheet> {
  static const _reasons = <(String, String)>[
    ('spam', 'Spam / istenmeyen içerik'),
    ('harassment', 'Taciz / hakaret'),
    ('fake_profile', 'Sahte profil'),
    ('inappropriate_content', 'Uygunsuz içerik'),
    ('other', 'Diğer'),
  ];

  String _selected = _reasons.first.$1;
  final _descCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await ref.read(moderationRepositoryProvider).reportUser(
            widget.userId,
            _selected,
            description:
                _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
          );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Şikayetin alındı. Ekibimiz inceleyecek.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              const Text('🚩  ', style: TextStyle(fontSize: 18)),
              Expanded(
                child: Text(
                  '${widget.userName} şikayet et',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Sebep seç',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final r in _reasons)
                ChoiceChip(
                  label: Text(r.$2),
                  selected: _selected == r.$1,
                  onSelected: (_) => setState(() => _selected = r.$1),
                  selectedColor: AppColors.primaryLight,
                  labelStyle: TextStyle(
                    color: _selected == r.$1
                        ? AppColors.primary
                        : AppColors.textPrimary,
                    fontWeight: _selected == r.$1
                        ? FontWeight.w600
                        : FontWeight.w500,
                    fontSize: 12.5,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Açıklama (opsiyonel)',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _descCtrl,
            maxLines: 3,
            maxLength: 500,
            decoration: const InputDecoration(
              hintText: 'Olayı kısaca anlat (opsiyonel)',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.error,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Gönder',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
