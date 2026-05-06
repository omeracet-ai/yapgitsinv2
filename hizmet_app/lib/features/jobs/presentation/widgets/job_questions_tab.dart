import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/job_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final jobQuestionsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>(
  (ref, jobId) => ref.read(jobRepositoryProvider).getJobQuestions(jobId),
);

  final String jobId;
  final String? currentUserId;
  final bool isOwner;
  final String jobStatus;

  const JobQuestionsTab({
    super.key,
    required this.jobId,
    required this.currentUserId,
    required this.isOwner,
    required this.jobStatus,
  });

  @override
  ConsumerState<JobQuestionsTab> createState() => _JobQuestionsTabState();
}

class _JobQuestionsTabState extends ConsumerState<JobQuestionsTab> {
  final _questionCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _questionCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendQuestion() async {
    final text = _questionCtrl.text.trim();
    if (text.isEmpty) return;

    final auth = ref.read(authStateProvider);
    if (auth is! AuthAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Soru sormak için giriş yapmalısınız.')),
      );
      return;
    }

    setState(() => _sending = true);
    try {
      await ref.read(jobRepositoryProvider).postJobQuestion(widget.jobId, text);
      _questionCtrl.clear();
      ref.invalidate(jobQuestionsProvider(widget.jobId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sorunuz gönderildi!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final questionsAsync = ref.watch(jobQuestionsProvider(widget.jobId));
    final isLoggedIn = ref.watch(authStateProvider) is AuthAuthenticated;

    return Column(
      children: [
        // Uyarı banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.blue.shade50,
          child: Row(
            children: [
              Icon(Icons.visibility_outlined,
                  size: 16, color: Colors.blue.shade600),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Bu mesajlar herkese açıktır. Kişisel bilgi paylaşmayın.',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                ),
              ),
            ],
          ),
        ),

        // Soru formu
        if (isLoggedIn && !widget.isOwner && widget.jobStatus == 'open')
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: Colors.white,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.primaryLight,
                  child: Icon(Icons.person, color: AppColors.primary, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _questionCtrl,
                    maxLines: 3,
                    minLines: 1,
                    decoration: InputDecoration(
                      hintText: 'Soru sor...',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sending ? null : _sendQuestion,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: _sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded,
                            color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),

        if (isLoggedIn && !widget.isOwner && widget.jobStatus == 'open')
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                const Icon(Icons.token, size: 13, color: AppColors.accent),
                const SizedBox(width: 4),
                Text(
                  'Soru sormak için bu ilana teklif vermiş olmanız gerekir (5 token)',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),

        const Divider(height: 1),

        // Sorular listesi
        Expanded(
          child: questionsAsync.when(
            data: (questions) => questions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline,
                            size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(
                          'Henüz soru sorulmamış.',
                          style: TextStyle(color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: questions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => _QuestionCard(
                      question: questions[i],
                      jobId: widget.jobId,
                      currentUserId: widget.currentUserId,
                      isOwner: widget.isOwner,
                      jobStatus: widget.jobStatus,
                      onReplySent: () =>
                          ref.invalidate(jobQuestionsProvider(widget.jobId)),
                    ),
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Text(e.toString().replaceFirst('Exception: ', ''),
                  style: const TextStyle(color: AppColors.error)),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuestionCard extends ConsumerStatefulWidget {
  final Map<String, dynamic> question;
  final String jobId;
  final String? currentUserId;
  final bool isOwner;
  final String jobStatus;
  final VoidCallback onReplySent;

  const _QuestionCard({
    required this.question,
    required this.jobId,
    required this.currentUserId,
    required this.isOwner,
    required this.jobStatus,
    required this.onReplySent,
  });

  @override
  ConsumerState<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends ConsumerState<_QuestionCard> {
  bool _showReplyBox = false;
  final _replyCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendReply() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(jobRepositoryProvider).postQuestionReply(
            widget.jobId,
            widget.question['id'] as String,
            text,
          );
      _replyCtrl.clear();
      setState(() => _showReplyBox = false);
      widget.onReplySent();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.question['user'] as Map<String, dynamic>?;
    final name = user?['fullName'] as String? ?? 'Kullanıcı';
    final imgUrl = user?['profileImageUrl'] as String?;
    final text = widget.question['text'] as String? ?? '';
    final createdAt = widget.question['createdAt'] as String?;
    final replies =
        (widget.question['replies'] as List?)?.cast<Map<String, dynamic>>() ??
            [];

    final isQuestionOwner = widget.currentUserId != null &&
        widget.currentUserId == (user?['id'] as String?);
    final canReply = (widget.isOwner || isQuestionOwner) && widget.jobStatus == 'open';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 4,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Soru
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.primaryLight,
                  backgroundImage: imgUrl != null ? NetworkImage(imgUrl) : null,
                  child: imgUrl == null
                      ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold))
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 13)),
                          const Spacer(),
                          if (createdAt != null)
                            Text(_timeAgo(createdAt),
                                style: TextStyle(
                                    fontSize: 11, color: Colors.grey.shade500)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(text,
                          style: const TextStyle(fontSize: 14, height: 1.4)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Yanıtlar
          if (replies.isNotEmpty) ...[
            Divider(height: 1, color: Colors.grey.shade100),
            ...replies.map((r) => _ReplyTile(reply: r)),
          ],

          // Yanıt kutusu
          if (canReply) ...[
            Divider(height: 1, color: Colors.grey.shade100),
            if (_showReplyBox)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _replyCtrl,
                        maxLines: 2,
                        minLines: 1,
                        decoration: InputDecoration(
                          hintText: 'Yanıtınız...',
                          filled: true,
                          fillColor: AppColors.background,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _sending ? null : _sendReply,
                      child: Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: _sending
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.send_rounded,
                                color: Colors.white, size: 16),
                      ),
                    ),
                  ],
                ),
              )
            else
              TextButton.icon(
                onPressed: () => setState(() => _showReplyBox = true),
                icon: const Icon(Icons.reply_rounded,
                    size: 15, color: AppColors.primary),
                label: Text(
                  replies.isEmpty
                      ? 'Yanıtla'
                      : 'Yanıtları gör (${replies.length})',
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.primary),
                ),
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                ),
              ),
          ] else if (replies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              child: Text(
                '${replies.length} yanıt',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
              ),
            ),
        ],
      ),
    );
  }

  static String _timeAgo(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk';
      if (diff.inHours < 24) return '${diff.inHours} sa';
      return '${diff.inDays} gün';
    } catch (_) {
      return '';
    }
  }
}

class _ReplyTile extends StatelessWidget {
  final Map<String, dynamic> reply;
  const _ReplyTile({required this.reply});

  @override
  Widget build(BuildContext context) {
    final user = reply['user'] as Map<String, dynamic>?;
    final name = user?['fullName'] as String? ?? 'Kullanıcı';
    final imgUrl = user?['profileImageUrl'] as String?;
    final text = reply['text'] as String? ?? '';
    final createdAt = reply['createdAt'] as String?;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
      color: Colors.grey.shade50,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: 20),
          const Icon(Icons.subdirectory_arrow_right_rounded,
              size: 14, color: AppColors.primary),
          const SizedBox(width: 6),
          CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.primaryLight,
            backgroundImage: imgUrl != null ? NetworkImage(imgUrl) : null,
            child: imgUrl == null
                ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold))
                : null,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text(name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 12)),
                  const Spacer(),
                  if (createdAt != null)
                    Text(_timeAgo(createdAt),
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey.shade500)),
                ]),
                const SizedBox(height: 2),
                Text(text, style: const TextStyle(fontSize: 13, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _timeAgo(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk';
      if (diff.inHours < 24) return '${diff.inHours} sa';
      return '${diff.inDays} gün';
    } catch (_) {
      return '';
    }
  }
}
