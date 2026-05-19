import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/escrow_repository.dart';

/// Phase 253 — "Uyuşmazlık Bildir" — visible to both customer and worker when
/// escrow is HELD (or RELEASED) and not already disputed.
class DisputeButton extends ConsumerWidget {
  final String bookingId;
  const DisputeButton({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(escrowByBookingProvider(bookingId));
    return async.maybeWhen(
      data: (e) {
        if (e == null) return const SizedBox.shrink();
        if (e.isDisputed) return const SizedBox.shrink();
        if (e.status != EscrowStatus.held &&
            e.status != EscrowStatus.released) {
          return const SizedBox.shrink();
        }
        return SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _confirm(context, e.id),
            icon: const Icon(Icons.report_gmailerrorred_outlined,
                size: 18, color: Color(0xFFC0392B)),
            label: const Text('Uyuşmazlık Bildir',
                style: TextStyle(color: Color(0xFFC0392B))),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFC0392B)),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  Future<void> _confirm(BuildContext context, String escrowId) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Uyuşmazlık Bildir'),
        content: const Text(
            'Bu işlem için uyuşmazlık başlatmak istediğine emin misin?\n\n'
            'Ödeme dondurulacak ve admin ekibi inceleyecek.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Vazgeç')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style:
                ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC0392B)),
            child: const Text('Devam Et',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (!context.mounted) return;
    context.push('/escrow/$escrowId/dispute', extra: {'bookingId': bookingId});
  }
}
