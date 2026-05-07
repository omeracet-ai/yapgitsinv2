import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/user_actions_repository.dart';

/// Engelle / Şikayet et popup menüsü.
class UserActionMenu extends ConsumerWidget {
  final String userId;
  final String userName;
  final Color? iconColor;

  const UserActionMenu({
    super.key,
    required this.userId,
    required this.userName,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: iconColor ?? Colors.grey.shade700),
      tooltip: 'Daha fazla',
      onSelected: (value) async {
        if (value == 'block') {
          await _confirmBlock(context, ref);
        } else if (value == 'report') {
          await _showReportDialog(context, ref);
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(
          value: 'block',
          child: Row(children: [
            Text('🚫  '),
            Text('Engelle'),
          ]),
        ),
        PopupMenuItem(
          value: 'report',
          child: Row(children: [
            Text('🚩  '),
            Text('Şikayet Et'),
          ]),
        ),
      ],
    );
  }

  Future<void> _confirmBlock(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kullanıcıyı engelle'),
        content: Text('$userName kullanıcısını engellemek istediğine emin misin? '
            'Bu kullanıcının ilanlarını ve mesajlarını görmeyeceksin.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('İptal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Engelle'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(userActionsRepositoryProvider).blockUser(userId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Engellendi')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<void> _showReportDialog(BuildContext context, WidgetRef ref) async {
    const reasons = [
      ('spam', 'Spam'),
      ('harassment', 'Taciz'),
      ('fraud', 'Dolandırıcılık'),
      ('inappropriate', 'Uygunsuz İçerik'),
      ('other', 'Diğer'),
    ];
    String selected = reasons.first.$1;
    final descCtrl = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text('$userName şikayet et'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sebep', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: selected,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    for (final r in reasons)
                      DropdownMenuItem(value: r.$1, child: Text(r.$2)),
                  ],
                  onChanged: (v) => setState(() { if (v != null) selected = v; }),
                ),
                const SizedBox(height: 12),
                const Text('Açıklama (opsiyonel)',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Detay vermek istersen yazabilirsin',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('İptal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Gönder'),
            ),
          ],
        ),
      ),
    );

    if (submitted != true || !context.mounted) return;
    try {
      await ref.read(userActionsRepositoryProvider).reportUser(
            userId,
            selected,
            description: descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
          );
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Şikayet alındı')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }
}
