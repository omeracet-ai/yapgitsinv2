import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/ai_repository.dart';

/// Phase 74 — Yapgitsin AI Assistant chat screen.
///
/// Uses backend `/ai/chat` for a general-purpose conversational assistant
/// (price tips, listing advice, category suggestions, contact tips). Distinct
/// from `/destek` (SupportAgentScreen) which is platform-support oriented.
class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  // {role: 'user'|'assistant', content: '...'}
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content':
          'Merhaba! Yapgitsin asistanınız. Size nasıl yardımcı olabilirim? '
              'Örneğin: "En uygun temizlik fiyatı ne?", "İyi ilan nasıl yazılır?"',
    },
  ];
  bool _loading = false;

  static const _suggestions = [
    'Fiyat tahmini al',
    'İlan ipucu ver',
    'Kategori öner',
    'İletişim önerisi',
  ];

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send([String? overrideText]) async {
    final text = (overrideText ?? _controller.text).trim();
    if (text.isEmpty || _loading) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _loading = true;
    });
    _controller.clear();
    _scrollToBottom();

    // history excludes the just-added user message
    final history = _messages.sublist(0, _messages.length - 1);

    try {
      final reply = await ref.read(aiRepositoryProvider).chat(
            message: text,
            history: history,
          );
      if (mounted) {
        setState(() => _messages.add({'role': 'assistant', 'content': reply}));
        _scrollToBottom();
      }
    } catch (_) {
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
        title: const Text('🤖 Yapgitsin Asistan'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildSuggestionStrip(),
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
                  Text(
                    'Yanıt hazırlanıyor…',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildSuggestionStrip() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final s in _suggestions) ...[
              ActionChip(
                label: Text(s, style: const TextStyle(fontSize: 13)),
                onPressed: _loading ? null : () => _send(s),
                backgroundColor: AppColors.primaryLight,
                side: const BorderSide(color: AppColors.primary),
                labelStyle: const TextStyle(color: AppColors.primary),
              ),
              const SizedBox(width: 8),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInput() {
    return SafeArea(
      top: false,
      child: Container(
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
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _loading ? null : () => _send(),
            ),
          ),
        ],
      ),
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
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
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
              offset: const Offset(0, 2),
            ),
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
