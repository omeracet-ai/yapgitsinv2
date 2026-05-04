import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/ai_repository.dart';

class SupportAgentScreen extends ConsumerStatefulWidget {
  const SupportAgentScreen({super.key});

  @override
  ConsumerState<SupportAgentScreen> createState() => _SupportAgentScreenState();
}

class _SupportAgentScreenState extends ConsumerState<SupportAgentScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  // Each message: {'role': 'user'|'assistant', 'content': '...'}
  final List<Map<String, String>> _messages = [];
  bool _loading = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _loading) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _loading = true;
    });
    _controller.clear();
    _scrollToBottom();

    // history without the last user message (already appended above)
    final history = _messages.sublist(0, _messages.length - 1);

    try {
      final reply = await ref.read(aiRepositoryProvider).supportAgent(
            message: text,
            history: history,
          );
      if (mounted) {
        setState(() => _messages.add({'role': 'assistant', 'content': reply}));
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _messages.add({
              'role': 'assistant',
              'content': 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
            }));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Destek Asistanı'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          if (_messages.isEmpty)
            Expanded(child: _buildWelcome())
          else
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (_, i) => _MessageBubble(msg: _messages[i]),
              ),
            ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 8),
                  Text('Yanıt hazırlanıyor…',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                ],
              ),
            ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildWelcome() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.support_agent, size: 64, color: AppColors.primary),
            const SizedBox(height: 16),
            Text(
              'Nasıl yardımcı olabilirim?',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Token, ödeme, ilan yönetimi veya platform hakkında her türlü sorunuzu sorabilirsiniz.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                _QuickChip('Token nasıl kullanılır?', onTap: _sendQuick),
                _QuickChip('Ödeme nasıl yapılır?', onTap: _sendQuick),
                _QuickChip('İlan nasıl veririm?', onTap: _sendQuick),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _sendQuick(String text) {
    _controller.text = text;
    _send();
  }

  Widget _buildInput() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
              decoration: InputDecoration(
                hintText: 'Mesajınızı yazın…',
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _send,
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, String> msg;
  const _MessageBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final isUser = msg['role'] == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ],
        ),
        child: Text(
          msg['content'] ?? '',
          style: TextStyle(
            color: isUser ? Colors.white : AppColors.textPrimary,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  final String label;
  final void Function(String) onTap;
  const _QuickChip(this.label, {required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 13)),
      onPressed: () => onTap(label),
      backgroundColor: Colors.white,
      side: const BorderSide(color: AppColors.primary),
      labelStyle: const TextStyle(color: AppColors.primary),
    );
  }
}
