import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/saved_jobs_provider.dart';

/// Bookmark icon button — toggles saved-job state for the given jobId.
class SaveJobButton extends ConsumerStatefulWidget {
  final String jobId;
  final double size;
  final Color? inactiveColor;

  const SaveJobButton({
    super.key,
    required this.jobId,
    this.size = 22,
    this.inactiveColor,
  });

  @override
  ConsumerState<SaveJobButton> createState() => _SaveJobButtonState();
}

class _SaveJobButtonState extends ConsumerState<SaveJobButton> {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(savedJobsProvider.notifier).loadIfNeeded());
  }

  Future<void> _onTap() async {
    if (_busy || widget.jobId.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(savedJobsProvider.notifier).toggle(widget.jobId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final saved = ref.watch(savedJobsProvider);
    final isSaved = saved.contains(widget.jobId);
    return InkWell(
      onTap: _onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(
          isSaved ? Icons.bookmark : Icons.bookmark_border,
          color: isSaved
              ? AppColors.primary
              : (widget.inactiveColor ?? AppColors.textHint),
          size: widget.size,
        ),
      ),
    );
  }
}
