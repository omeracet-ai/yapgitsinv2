import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/escrow_repository.dart';
import '../../../../core/theme/app_colors.dart';

/// Phase 253 — Escrow dispute form. Submits POST /escrow/:id/dispute.
class DisputeFormScreen extends ConsumerStatefulWidget {
  final String escrowId;
  final String? bookingId;
  const DisputeFormScreen({super.key, required this.escrowId, this.bookingId});

  @override
  ConsumerState<DisputeFormScreen> createState() => _DisputeFormScreenState();
}

class _DisputeFormScreenState extends ConsumerState<DisputeFormScreen> {
  final _reasonCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final reason = _reasonCtrl.text.trim();
    if (reason.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Lütfen en az 10 karakter açıklama girin'),
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref
          .read(escrowRepositoryProvider)
          .dispute(widget.escrowId, reason);
      if (!mounted) return;
      if (widget.bookingId != null) {
        ref.invalidate(escrowByBookingProvider(widget.bookingId!));
      }
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Uyuşmazlık kaydedildi. Ekip inceleyecek.'),
        backgroundColor: AppColors.success,
      ));
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceFirst('Exception: ', '')),
        backgroundColor: AppColors.error,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Uyuşmazlık Bildir')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Yaşadığınız sorunu detaylıca açıklayın. Admin ekibi her iki '
              'tarafı dinleyerek karar verecek.',
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _reasonCtrl,
              maxLines: 7,
              maxLength: 500,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText:
                    'Örn: Hizmet veren belirlenen saatte gelmedi, iletişim kuramadım...',
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFC0392B),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Uyuşmazlık Gönder'),
            ),
          ],
        ),
      ),
    );
  }
}
