import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/message_templates_provider.dart';
import '../../data/message_templates_repository.dart';

class MessageTemplatesScreen extends ConsumerStatefulWidget {
  const MessageTemplatesScreen({super.key});

  @override
  ConsumerState<MessageTemplatesScreen> createState() =>
      _MessageTemplatesScreenState();
}

class _MessageTemplatesScreenState
    extends ConsumerState<MessageTemplatesScreen> {
  final _ctrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(messageTemplatesRepositoryProvider).add(text);
      _ctrl.clear();
      ref.invalidate(messageTemplatesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(int index) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Şablonu sil?'),
        content: const Text('Bu şablon kalıcı olarak silinecek.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sil',
                  style: TextStyle(color: AppColors.error))),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(messageTemplatesRepositoryProvider).remove(index);
      ref.invalidate(messageTemplatesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(messageTemplatesProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mesaj Şablonlarım'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Yeni Şablon',
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _ctrl,
                  maxLength: 500,
                  maxLines: 4,
                  minLines: 2,
                  decoration: InputDecoration(
                    hintText:
                        'Örn: Merhaba, ilanınız hâlâ aktif mi? Detayları konuşabilir miyiz?',
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _busy ? null : _add,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Şablon Ekle'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding:
                          const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: async.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                      e.toString().replaceFirst('Exception: ', ''),
                      textAlign: TextAlign.center),
                ),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return ListView(
                    padding: const EdgeInsets.all(32),
                    children: const [
                      SizedBox(height: 40),
                      Icon(Icons.chat_bubble_outline,
                          size: 56, color: AppColors.textSecondary),
                      SizedBox(height: 12),
                      Text('Henüz şablon yok',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600)),
                      SizedBox(height: 6),
                      Text(
                        'Sık kullandığın mesajları buraya kaydet, sohbette tek tıkla yapıştır.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary),
                      ),
                    ],
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.refresh(messageTemplatesProvider.future),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: list.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 8),
                    itemBuilder: (ctx, i) => Card(
                      margin: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Icon(Icons.bookmark_outline,
                                  color: AppColors.primary, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(list[i],
                                  style: const TextStyle(
                                      fontSize: 14, height: 1.4)),
                            ),
                            IconButton(
                              onPressed:
                                  _busy ? null : () => _delete(i),
                              icon: const Icon(Icons.delete_outline,
                                  color: AppColors.error),
                              tooltip: 'Sil',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
