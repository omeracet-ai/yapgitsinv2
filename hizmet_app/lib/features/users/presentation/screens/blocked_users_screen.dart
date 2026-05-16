import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../data/blocked_users_provider.dart';

class BlockedUsersScreen extends ConsumerWidget {
  const BlockedUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocksAsync = ref.watch(myBlocksListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Engellenenler'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: blocksAsync.when(
        loading: () => ListSkeleton(itemCount: 5, itemBuilder: (_) => const ProviderCardSkeleton()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              e.toString().replaceFirst('Exception: ', ''),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textHint),
            ),
          ),
        ),
        data: (blocks) {
          if (blocks.isEmpty) return const _EmptyState();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myBlocksListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: blocks.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _BlockedRow(record: blocks[i]),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.block_rounded,
                size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 20),
          const Text(
            'Engellediğin kullanıcı yok',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Profil ekranındaki menüden bir kullanıcıyı engelleyebilirsin.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textHint),
            ),
          ),
        ],
      ),
    );
  }
}

class _BlockedRow extends ConsumerStatefulWidget {
  final Map<String, dynamic> record;
  const _BlockedRow({required this.record});

  @override
  ConsumerState<_BlockedRow> createState() => _BlockedRowState();
}

class _BlockedRowState extends ConsumerState<_BlockedRow> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final user = (widget.record['blockedUser'] as Map?) ?? const {};
    final id = (widget.record['blockedId'] ?? user['id'] ?? '').toString();
    final name = (user['fullName'] ?? 'Kullanıcı').toString();
    final imgUrl = user['profileImageUrl'] as String?;
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primaryLight,
            backgroundImage: imgUrl != null ? NetworkImage(imgUrl) : null,
            child: imgUrl == null
                ? Text(initials,
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              name,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontSize: 14.5),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          OutlinedButton(
            onPressed: _busy || id.isEmpty
                ? null
                : () async {
                    setState(() => _busy = true);
                    try {
                      await ref
                          .read(blockedUsersProvider.notifier)
                          .unblock(id);
                      if (!context.mounted) return;
                      ref.invalidate(myBlocksListProvider);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Engelleme kaldırıldı')),
                      );
                    } catch (e) {
                      if (!context.mounted) return;
                      setState(() => _busy = false);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(e
                                .toString()
                                .replaceFirst('Exception: ', ''))),
                      );
                    }
                  },
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            child: _busy
                ? const SizedBox(
                    height: 14,
                    width: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Engellemeyi Kaldır',
                    style: TextStyle(fontSize: 12.5)),
          ),
        ],
      ),
    );
  }
}
