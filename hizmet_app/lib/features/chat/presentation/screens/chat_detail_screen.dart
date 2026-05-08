import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/chat_service.dart';
import '../../widgets/chat_message_group.dart';
import '../../widgets/date_divider.dart';
import '../../widgets/typing_indicator.dart';

/// Phase 66: scaffold provider for peer-typing state.
/// Phase 67 will wire WebSocket "typing" events to this.
final chatTypingProvider = StateProvider<bool>((ref) => false);

class ChatDetailScreen extends ConsumerStatefulWidget {
  final String peerName;
  final String peerId;

  const ChatDetailScreen({
    super.key,
    required this.peerName,
    required this.peerId,
  });

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  final ScrollController _scrollController = ScrollController();

  // Phase 67: typing-event state.
  Timer? _typingStopTimer;
  Timer? _peerTypingClearTimer;
  bool _isLocallyTyping = false;
  static const String _meId = 'me';

  String get _roomId {
    // Stable room id for the 1:1 conversation, independent of sender order.
    final ids = [_meId, widget.peerId]..sort();
    return 'dm:${ids[0]}:${ids[1]}';
  }

  @override
  void initState() {
    super.initState();
    final chatService = ref.read(chatServiceProvider);
    chatService.connect();
    chatService.joinRoom(_roomId);
    chatService.onMessageReceived((data) {
      if (mounted) {
        setState(() {
          _messages.add({
            'from': data['from'],
            'message': data['message'],
            'timestamp': DateTime.now(),
          });
        });
        _scrollToBottom();
      }
    });
    // Phase 67: peer typing listener.
    chatService.onUserTyping((userId, isTyping) {
      if (!mounted) return;
      if (userId == _meId) return; // ignore own echoes
      ref.read(chatTypingProvider.notifier).state = isTyping;
      _peerTypingClearTimer?.cancel();
      if (isTyping) {
        // Safety: clear stale "yazıyor…" if no follow-up event arrives.
        _peerTypingClearTimer = Timer(const Duration(seconds: 5), () {
          if (mounted) {
            ref.read(chatTypingProvider.notifier).state = false;
          }
        });
      }
    });
  }

  void _onTextChanged(String _) {
    final chatService = ref.read(chatServiceProvider);
    if (!_isLocallyTyping) {
      _isLocallyTyping = true;
      chatService.emitTyping(_roomId, _meId, true);
    }
    _typingStopTimer?.cancel();
    _typingStopTimer = Timer(const Duration(seconds: 2), () {
      _isLocallyTyping = false;
      chatService.emitTyping(_roomId, _meId, false);
    });
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final chatService = ref.read(chatServiceProvider);
    chatService.sendMessage(widget.peerId, 'me', _messageController.text);

    setState(() {
      _messages.add({
        'from': 'me',
        'message': _messageController.text,
        'timestamp': DateTime.now(),
      });
    });

    _messageController.clear();
    _scrollToBottom();

    // Sending implies typing has stopped.
    _typingStopTimer?.cancel();
    if (_isLocallyTyping) {
      _isLocallyTyping = false;
      ref.read(chatServiceProvider).emitTyping(_roomId, _meId, false);
    }
  }

  @override
  void dispose() {
    _typingStopTimer?.cancel();
    _peerTypingClearTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Computes per-message rendering flags by walking the list once.
  /// Decides: dateDivider before message, showAvatar, showTime,
  /// isFirstInGroup, isLastInGroup.
  List<_RenderItem> _buildRenderItems() {
    final items = <_RenderItem>[];
    for (var i = 0; i < _messages.length; i++) {
      final msg = _messages[i];
      final ts = msg['timestamp'] as DateTime? ?? DateTime.now();
      final from = msg['from'] as String? ?? '';

      final prev = i > 0 ? _messages[i - 1] : null;
      final next = i < _messages.length - 1 ? _messages[i + 1] : null;

      final prevTs = prev?['timestamp'] as DateTime?;
      final nextTs = next?['timestamp'] as DateTime?;
      final prevFrom = prev?['from'] as String?;
      final nextFrom = next?['from'] as String?;

      // Date divider when 1+ hour gap or no previous message
      final showDivider = prevTs == null ||
          ts.difference(prevTs).inMinutes >= 60;

      // First-in-group: previous from different sender or 1+ minute gap
      final isFirstInGroup = prevFrom != from ||
          prevTs == null ||
          ts.difference(prevTs).inMinutes >= 1;

      // Last-in-group: next from different sender or 1+ minute gap
      final isLastInGroup = nextFrom != from ||
          nextTs == null ||
          nextTs.difference(ts).inMinutes >= 1;

      // Avatar only on first message of a same-sender group (peer side only)
      final showAvatar = isFirstInGroup;

      // Timestamp shown on last message of a same-minute group
      final showTime = isLastInGroup;

      items.add(_RenderItem(
        index: i,
        message: msg['message'] as String? ?? '',
        from: from,
        timestamp: ts,
        showDivider: showDivider,
        showAvatar: showAvatar,
        showTime: showTime,
        isFirstInGroup: isFirstInGroup,
        isLastInGroup: isLastInGroup,
      ));
    }
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final isTyping = ref.watch(chatTypingProvider);
    final renderItems = _buildRenderItems();

    return Scaffold(
      backgroundColor: const Color(0xFFECF0F5),
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: Text(
                    widget.peerName.isNotEmpty
                        ? widget.peerName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Positioned(
                  right: 1,
                  bottom: 1,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C9A7),
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: AppColors.primary, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.peerName,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.white)),
                Text(isTyping ? 'yazıyor…' : 'Çevrimiçi',
                    style: const TextStyle(
                        fontSize: 11, color: Color(0xFF00C9A7))),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert_rounded, color: Colors.white),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 16),
                    itemCount: renderItems.length,
                    itemBuilder: (context, index) {
                      final item = renderItems[index];
                      final isMe = item.from == 'me';
                      return Column(
                        children: [
                          if (item.showDivider)
                            DateDivider(date: item.timestamp),
                          ChatMessageBubble(
                            text: item.message,
                            isMe: isMe,
                            showAvatar: !isMe && item.showAvatar,
                            showTime: item.showTime,
                            timestamp: item.timestamp,
                            peerName: widget.peerName,
                            isFirstInGroup: item.isFirstInGroup,
                            isLastInGroup: item.isLastInGroup,
                          ),
                        ],
                      );
                    },
                  ),
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: isTyping
                ? TypingIndicator(
                    key: const ValueKey('typing'),
                    peerName: widget.peerName,
                  )
                : const SizedBox.shrink(key: ValueKey('no-typing')),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.chat_bubble_outline_rounded,
                size: 40, color: AppColors.primary),
          ),
          const SizedBox(height: 14),
          const Text('Henüz mesaj yok',
              style: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          const Text('Merhaba diyerek başlayın!',
              style:
                  TextStyle(color: AppColors.textHint, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Container(
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.attach_file_rounded,
                    color: AppColors.primary, size: 20),
                onPressed: () {},
                constraints:
                    const BoxConstraints(minWidth: 40, minHeight: 40),
                padding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                    color: const Color(0xFFF1F4F8),
                    borderRadius: BorderRadius.circular(24),
                    border:
                        Border.all(color: AppColors.border, width: 1)),
                child: TextField(
                  controller: _messageController,
                  maxLines: 4,
                  minLines: 1,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: _onTextChanged,
                  decoration: const InputDecoration(
                    hintText: 'Mesaj yazın...',
                    hintStyle: TextStyle(
                        color: AppColors.textHint, fontSize: 14),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _sendMessage,
              child: Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send_rounded,
                    color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RenderItem {
  final int index;
  final String message;
  final String from;
  final DateTime timestamp;
  final bool showDivider;
  final bool showAvatar;
  final bool showTime;
  final bool isFirstInGroup;
  final bool isLastInGroup;

  _RenderItem({
    required this.index,
    required this.message,
    required this.from,
    required this.timestamp,
    required this.showDivider,
    required this.showAvatar,
    required this.showTime,
    required this.isFirstInGroup,
    required this.isLastInGroup,
  });
}
