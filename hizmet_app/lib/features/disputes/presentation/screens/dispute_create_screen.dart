import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_dispute_repository.dart';

class DisputeCreateScreen extends ConsumerStatefulWidget {
  final String againstUserId;
  final String? jobId;
  final String? bookingId;
  const DisputeCreateScreen({
    super.key,
    required this.againstUserId,
    this.jobId,
    this.bookingId,
  });

  @override
  ConsumerState<DisputeCreateScreen> createState() =>
      _DisputeCreateScreenState();
}

class _DisputeCreateScreenState extends ConsumerState<DisputeCreateScreen> {
  String _type = 'quality';
  final _descCtrl = TextEditingController();
  bool _loading = false;

  static const _types = <String, String>{
    'quality': 'Kalite sorunu',
    'payment': 'Ödeme sorunu',
    'no_show': 'Gelmedi',
    'fraud': 'Dolandırıcılık',
    'other': 'Diğer',
  };

  Future<void> _submit() async {
    if (_descCtrl.text.trim().length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Lütfen en az 10 karakter açıklama girin'),
      ));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(disputeRepositoryProvider).createDispute(
            jobId: widget.jobId,
            bookingId: widget.bookingId,
            againstUserId: widget.againstUserId,
            type: _type,
            description: _descCtrl.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Şikayetiniz alındı, ekip inceleyecek.'),
      ));
      context.go('/sikayetlerim');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Şikayet Oluştur')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Şikayet Türü',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _type,
            items: _types.entries
                .map((e) =>
                    DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: (v) => setState(() => _type = v ?? 'quality'),
            decoration: const InputDecoration(border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          const Text('Açıklama',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: _descCtrl,
            maxLines: 6,
            maxLength: 1000,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Yaşadığınız sorunu detaylıca anlatın...',
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Text('Şikayet Gönder'),
          ),
        ]),
      ),
    );
  }
}
