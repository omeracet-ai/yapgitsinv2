import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/favorites_provider.dart';

/// Heart icon button — toggles favorite state for the given workerId.
/// Reads from [favoritesProvider] for instant cross-screen sync.
class FavoriteButton extends ConsumerStatefulWidget {
  final String workerId;
  final double size;
  final Color? inactiveColor;

  const FavoriteButton({
    super.key,
    required this.workerId,
    this.size = 22,
    this.inactiveColor,
  });

  @override
  ConsumerState<FavoriteButton> createState() => _FavoriteButtonState();
}

class _FavoriteButtonState extends ConsumerState<FavoriteButton> {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(favoritesProvider.notifier).loadIfNeeded());
  }

  Future<void> _onTap() async {
    if (_busy || widget.workerId.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(favoritesProvider.notifier).toggle(widget.workerId);
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
    final favs = ref.watch(favoritesProvider);
    final isFav = favs.contains(widget.workerId);
    return InkWell(
      onTap: _onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(
          isFav ? Icons.favorite : Icons.favorite_border,
          color: isFav
              ? AppColors.error
              : (widget.inactiveColor ?? AppColors.textHint),
          size: widget.size,
        ),
      ),
    );
  }
}
