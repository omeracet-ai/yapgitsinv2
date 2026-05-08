import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/escrow_repository.dart';

/// Phase 136 — Compact escrow status pill for booking tiles.
class EscrowStatusBadge extends ConsumerWidget {
  final String bookingId;
  const EscrowStatusBadge({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(escrowByBookingProvider(bookingId));
    return async.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (e) {
        if (e == null) return const SizedBox.shrink();
        late final String label;
        late final Color bg;
        late final Color fg;
        switch (e.status) {
          case EscrowStatus.held:
            label = '💰 Ödeme Yatırıldı';
            bg = const Color(0xFFFFF4E0);
            fg = const Color(0xFFB8730F);
            break;
          case EscrowStatus.released:
            label = '✅ Tamamlandı';
            bg = const Color(0xFFE3F8EE);
            fg = const Color(0xFF0A8554);
            break;
          case EscrowStatus.refunded:
          case EscrowStatus.cancelled:
            label = '↩️ İade Edildi';
            bg = const Color(0xFFFCE9E9);
            fg = const Color(0xFFB73A3A);
            break;
          default:
            label = e.status;
            bg = Colors.grey.shade200;
            fg = Colors.grey.shade800;
        }
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        );
      },
    );
  }
}

/// "İşi Onayla ve Öde" — visible to customer when escrow held & booking in_progress.
class EscrowReleaseButton extends ConsumerStatefulWidget {
  final String bookingId;
  final VoidCallback? onReleased;
  const EscrowReleaseButton({
    super.key,
    required this.bookingId,
    this.onReleased,
  });

  @override
  ConsumerState<EscrowReleaseButton> createState() =>
      _EscrowReleaseButtonState();
}

class _EscrowReleaseButtonState extends ConsumerState<EscrowReleaseButton> {
  bool _busy = false;

  Future<void> _release() async {
    setState(() => _busy = true);
    try {
      await ref.read(escrowRepositoryProvider).release(widget.bookingId);
      if (!mounted) return;
      ref.invalidate(escrowByBookingProvider(widget.bookingId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ödeme ustaya aktarıldı')),
      );
      widget.onReleased?.call();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(escrowByBookingProvider(widget.bookingId));
    return async.maybeWhen(
      data: (e) {
        if (e == null || e.status != EscrowStatus.held) {
          return const SizedBox.shrink();
        }
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _busy ? null : _release,
            icon: const Icon(Icons.check_circle_outline),
            label: Text(_busy ? 'Onaylanıyor…' : 'İşi Onayla ve Öde'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00C9A7),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
