import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
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
  final DateTime? readAt;
  final String peerName;
  final bool isFirstInGroup;
  final bool isLastInGroup;
  // Phase 139: optional attachment metadata
  final String? attachmentUrl;
  final String? attachmentType; // 'image' | 'document'
  final String? attachmentName;
  final int? attachmentSize;

  const ChatMessageBubble({
    super.key,
    required this.text,
    required this.isMe,
    required this.showAvatar,
    required this.showTime,
    required this.timestamp,
    this.readAt,
    required this.peerName,
    this.isFirstInGroup = false,
    this.isLastInGroup = false,
    this.attachmentUrl,
    this.attachmentType,
    this.attachmentName,
    this.attachmentSize,
  });

  String _formatBytes(int b) {
    if (b < 1024) return '$b B';
    if (b < 1024 * 1024) return '${(b / 1024).toStringAsFixed(1)} KB';
    return '${(b / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

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
                  if (attachmentUrl != null && attachmentType == 'image')
                    _buildImageAttachment(context),
                  if (attachmentUrl != null && attachmentType == 'document')
                    _buildDocAttachment(),
                  if (text.isNotEmpty) ...[
                    if (attachmentUrl != null) const SizedBox(height: 6),
                    Text(
                      text,
                      style: TextStyle(
                        color: isMe ? Colors.white : AppColors.textPrimary,
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),
                  ],
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
                          // Phase 68: read receipt — single tick when unread,
                          // double tick (primary-tinted) when read.
                          Icon(
                            readAt == null
                                ? Icons.done_rounded
                                : Icons.done_all_rounded,
                            size: 13,
                            color: readAt == null
                                ? Colors.white.withValues(alpha: 0.6)
                                : const Color(0xFF7FD8FF),
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

  Widget _buildImageAttachment(BuildContext context) {
    final url = attachmentUrl!;
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => _ChatImageLightbox(url: url),
          ),
        );
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: CachedNetworkImage(
          imageUrl: url,
          width: 200,
          height: 200,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(
            width: 200,
            height: 200,
            color: Colors.black12,
            child: const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
          errorWidget: (_, __, ___) => Container(
            width: 200,
            height: 200,
            color: Colors.black12,
            child: const Icon(Icons.broken_image_rounded),
          ),
        ),
      ),
    );
  }

  Widget _buildDocAttachment() {
    final name = attachmentName ?? 'Belge';
    final size = attachmentSize ?? 0;
    final url = attachmentUrl!;
    final fg = isMe ? Colors.white : AppColors.textPrimary;
    final fgMuted =
        isMe ? Colors.white.withValues(alpha: 0.75) : AppColors.textSecondary;
    return InkWell(
      onTap: () async {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 240),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isMe
              ? Colors.white.withValues(alpha: 0.15)
              : AppColors.primaryLight,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.insert_drive_file_rounded,
                color: isMe ? Colors.white : AppColors.primary, size: 28),
            const SizedBox(width: 8),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: fg,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (size > 0)
                    Text(
                      _formatBytes(size),
                      style: TextStyle(color: fgMuted, fontSize: 11),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatImageLightbox extends StatelessWidget {
  final String url;
  const _ChatImageLightbox({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4,
          child: CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.contain,
            placeholder: (_, __) => const CircularProgressIndicator(),
            errorWidget: (_, __, ___) =>
                const Icon(Icons.broken_image, color: Colors.white, size: 48),
          ),
        ),
      ),
    );
  }
}
