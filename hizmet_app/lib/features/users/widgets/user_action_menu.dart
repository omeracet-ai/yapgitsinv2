import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/blocked_users_provider.dart';
import 'report_user_sheet.dart';

/// Engelle (toggle) / Şikayet et popup menüsü.
/// Block durumu [blockedUsersProvider] üzerinden okunur — etiket buna göre değişir.
class UserActionMenu extends ConsumerStatefulWidget {
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
  ConsumerState<UserActionMenu> createState() => _UserActionMenuState();
}

class _UserActionMenuState extends ConsumerState<UserActionMenu> {
  @override
  void initState() {
    super.initState();
    // best-effort: load block list once so the toggle label is correct
    Future.microtask(
      () => ref.read(blockedUsersProvider.notifier).loadIfNeeded(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isBlocked =
        ref.watch(blockedUsersProvider).contains(widget.userId);

    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert,
          color: widget.iconColor ?? Colors.grey.shade700),
      tooltip: 'Daha fazla',
      onSelected: (value) async {
        if (value == 'block') {
          await _confirmBlock(context, isBlocked: isBlocked);
        } else if (value == 'report') {
          await ReportUserSheet.show(
            context,
            userId: widget.userId,
            userName: widget.userName,
          );
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'block',
          child: Row(children: [
            Text(isBlocked ? '✅  ' : '🚫  '),
            Text(isBlocked ? 'Engellemeyi Kaldır' : 'Engelle'),
          ]),
        ),
        const PopupMenuItem(
          value: 'report',
          child: Row(children: [
            Text('🚩  '),
            Text('Şikayet Et'),
          ]),
        ),
      ],
    );
  }

  Future<void> _confirmBlock(BuildContext context,
      {required bool isBlocked}) async {
    if (isBlocked) {
      try {
        await ref
            .read(blockedUsersProvider.notifier)
            .unblock(widget.userId);
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Engelleme kaldırıldı')),
        );
      } catch (e) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
      return;
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kullanıcıyı engelle'),
        content: Text(
            '${widget.userName} kullanıcısını engellemek istediğine emin misin? '
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
      await ref.read(blockedUsersProvider.notifier).block(widget.userId);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kullanıcı engellendi')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }
}
