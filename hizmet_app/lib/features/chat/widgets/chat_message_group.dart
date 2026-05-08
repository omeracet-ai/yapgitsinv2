import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';

/// Renders a single chat message bubble within a group.
/// Avatar shown only for first message in a same-sender run.
/// Timestamp shown only on the first message of a same-minute run.
class ChatMessageBubble extends StatelessWidget {
  final String text;
  final bool isMe;
  final bool showAvatar;
  final bool showTime;
  final DateTime timestamp;
  final String peerName;
  final bool isFirstInGroup;
  final bool isLastInGroup;

  const ChatMessageBubble({
    super.key,
    required this.text,
    required this.isMe,
    required this.showAvatar,
    required this.showTime,
    required this.timestamp,
    required this.peerName,
    this.isFirstInGroup = false,
    this.isLastInGroup = false,
  });

  @override
  Widget build(BuildContext context) {
    const radius = Radius.circular(16);
    const tightRadius = Radius.circular(4);

    final bubbleRadius = BorderRadius.only(
      topLeft: (!isMe && !isFirstInGroup) ? tightRadius : radius,
      topRight: (isMe && !isFirstInGroup) ? tightRadius : radius,
      bottomLeft: (!isMe && isLastInGroup) ? tightRadius : radius,
      bottomRight: (isMe && isLastInGroup) ? tightRadius : radius,
    );

    return Padding(
      padding: EdgeInsets.only(
        bottom: isLastInGroup ? 8 : 2,
        left: isMe ? 60 : 0,
        right: isMe ? 0 : 60,
      ),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe)
            SizedBox(
              width: 34,
              child: showAvatar
                  ? CircleAvatar(
                      radius: 14,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        peerName.isNotEmpty
                            ? peerName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          Flexible(
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? AppColors.primary : AppColors.lightSurface,
                borderRadius: bubbleRadius,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: isMe
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  Text(
                    text,
                    style: TextStyle(
                      color: isMe ? Colors.white : AppColors.textPrimary,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                  if (showTime) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          DateFormat('HH:mm').format(timestamp),
                          style: TextStyle(
                            fontSize: 10,
                            color: isMe
                                ? Colors.white.withValues(alpha: 0.65)
                                : Colors.grey.shade400,
                          ),
                        ),
                        if (isMe) ...[
                          const SizedBox(width: 3),
                          Icon(
                            Icons.done_all_rounded,
                            size: 13,
                            color: Colors.white.withValues(alpha: 0.75),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
