import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/api_constants.dart';
import 'package:dio/dio.dart';
import '../../../users/widgets/user_action_menu.dart';
import '../../../tokens/widgets/gift_tokens_sheet.dart';
import '../providers/auth_provider.dart';
import '../../../reviews/widgets/review_reply_sheet.dart';
import '../../widgets/portfolio_gallery.dart';
import '../../widgets/availability_editor_sheet.dart';
import '../../../users/widgets/badge_row.dart';

final publicProfileProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
  (ref, userId) async {
    final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
    final resp = await dio.get('/users/$userId/profile');
    return Map<String, dynamic>.from(resp.data as Map);
  },
);

class PublicProfileScreen extends ConsumerWidget {
  final String userId;
  const PublicProfileScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(publicProfileProvider(userId));
    return profileAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Profil')),
        body: Center(child: Text(e.toString())),
      ),
      data: (data) => _ProfileView(data: data, userId: userId),
    );
  }
}

class _ProfileView extends ConsumerWidget {
  final Map<String, dynamic> data;
  final String userId;
  const _ProfileView({required this.data, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final currentUserId = authState is AuthAuthenticated
        ? authState.user['id'] as String?
        : null;
    final isSelf = currentUserId != null && currentUserId == userId;
    final name            = data['fullName']         as String? ?? 'Kullanıcı';
    final imgUrl          = data['profileImageUrl']  as String?;
    final city            = data['city']             as String? ?? '';
    final bio             = data['workerBio']        as String?;
    final rating          = (data['averageRating']   as num?)?.toDouble() ?? 0.0;
    final reviews         = (data['totalReviews']    as num?)?.toInt()    ?? 0;
    final reputation      = (data['reputationScore'] as num?)?.toInt()    ?? 0;
    final verified        = data['identityVerified'] == true;
    final totalCustomer   = (data['asCustomerTotal']   as num?)?.toInt() ?? 0;
    final successCustomer = (data['asCustomerSuccess'] as num?)?.toInt() ?? 0;
    final totalWorker     = (data['asWorkerTotal']     as num?)?.toInt() ?? 0;
    final successWorker   = (data['asWorkerSuccess']   as num?)?.toInt() ?? 0;
    final since           = data['createdAt']        as String?;
    final workerCats      = (data['workerCategories'] as List?)?.cast<String>() ?? [];
    final pastPhotos      = (data['pastPhotos']       as List?)?.cast<String>() ?? [];
    final portfolioPhotos = (data['portfolioPhotos']  as List?)?.cast<String>() ?? [];
    final reviewList      = (data['reviews']          as List?)
                                ?.cast<Map<String, dynamic>>() ?? [];
    final badges          = data['badges']            as List?;
    final isWorker        = workerCats.isNotEmpty;
    final availRaw        = data['availabilitySchedule'];
    final Map<String, bool>? availability = availRaw is Map
        ? availRaw.map((k, v) => MapEntry(k.toString(), v == true))
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Hero header ──────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.primary,
            actions: [
              if (!isSelf) ...[
                IconButton(
                  tooltip: 'Token hediye et',
                  icon: const Text('🎁', style: TextStyle(fontSize: 20)),
                  onPressed: () => GiftTokensSheet.show(
                    context,
                    recipientId: userId,
                    recipientName: name,
                  ),
                ),
                UserActionMenu(
                  userId: userId,
                  userName: name,
                  iconColor: Colors.white,
                ),
              ],
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.primary, AppColors.primaryDark],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 16),
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          CircleAvatar(
                            radius: 46,
                            backgroundColor: Colors.white24,
                            backgroundImage:
                                imgUrl != null ? NetworkImage(imgUrl) : null,
                            child: imgUrl == null
                                ? Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                                    style: const TextStyle(
                                        fontSize: 36,
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold))
                                : null,
                          ),
                          if (verified)
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.verified_rounded,
                                    color: AppColors.primary, size: 22),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(name,
                          style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white)),
                      if (city.isNotEmpty)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 13, color: Colors.white70),
                            const SizedBox(width: 3),
                            Text(city,
                                style: const TextStyle(
                                    fontSize: 13, color: Colors.white70)),
                          ],
                        ),
                      if (since != null)
                        Text(_memberSince(since),
                            style: const TextStyle(
                                fontSize: 11, color: Colors.white60)),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── İstatistikler ────────────────────────────────────────
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Row(
                    children: [
                      _bigStat(
                        label: rating > 0 ? rating.toStringAsFixed(1) : '—',
                        sub: '$reviews yorum',
                        icon: Icons.star_rounded,
                        iconColor: Colors.amber,
                      ),
                      _divider(),
                      _bigStat(
                        label: '$reputation',
                        sub: 'Puan',
                        icon: Icons.emoji_events_rounded,
                        iconColor: AppColors.accent,
                      ),
                      _divider(),
                      if (isWorker)
                        _bigStat(
                          label: totalWorker > 0
                              ? '%${(successWorker / totalWorker * 100).round()}'
                              : '—',
                          sub: 'Tamamlama',
                          icon: Icons.check_circle_outline_rounded,
                          iconColor: AppColors.success,
                        )
                      else
                        _bigStat(
                          label: '$totalCustomer',
                          sub: 'İş ilanı',
                          icon: Icons.work_outline_rounded,
                          iconColor: AppColors.primary,
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // ── Rozetler ─────────────────────────────────────────────
                if (badges != null && badges.isNotEmpty) ...[
                  _section(
                    title: 'Rozetler',
                    child: BadgeRow(badges: badges),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Hakkında (worker bio) ─────────────────────────────────
                if (bio != null && bio.isNotEmpty) ...[
                  _section(
                    title: 'Hakkında',
                    child: Text(bio,
                        style: const TextStyle(
                            fontSize: 14, height: 1.6, color: AppColors.textSecondary)),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Kategoriler ───────────────────────────────────────────
                if (workerCats.isNotEmpty) ...[
                  _section(
                    title: 'Hizmet Kategorileri',
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: workerCats
                          .map((c) => Chip(
                                label: Text(c,
                                    style: const TextStyle(
                                        fontSize: 12, color: AppColors.primary)),
                                backgroundColor: AppColors.primaryLight,
                                side: BorderSide.none,
                                padding: EdgeInsets.zero,
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Müsaitlik ────────────────────────────────────────────
                if (availability != null && isWorker) ...[
                  _section(
                    title: 'Müsaitlik',
                    child: AvailabilityChips(schedule: availability),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── İstatistik detayı ─────────────────────────────────────
                _section(
                  title: 'İstatistikler',
                  child: Column(
                    children: [
                      _statRow('Müşteri olarak tamamlanan',
                          '$successCustomer / $totalCustomer iş'),
                      const SizedBox(height: 6),
                      _statRow('Usta olarak tamamlanan',
                          '$successWorker / $totalWorker iş'),
                      if (verified) ...[
                        const SizedBox(height: 6),
                        _statRow('Kimlik doğrulama', 'Doğrulandı ✓',
                            valueColor: AppColors.primary),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // ── Portfolyo ────────────────────────────────────────────
                if (portfolioPhotos.isNotEmpty || isSelf) ...[
                  _section(
                    title: 'Portfolyo',
                    child: PortfolioGallery(
                      photos: portfolioPhotos,
                      isOwner: isSelf,
                      userId: userId,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Geçmiş fotoğraflar ────────────────────────────────────
                if (pastPhotos.isNotEmpty) ...[
                  _section(
                    title: 'Geçmiş İşler',
                    child: SizedBox(
                      height: 100,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: pastPhotos.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) => ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            pastPhotos[i],
                            width: 100,
                            height: 100,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Yorumlar ─────────────────────────────────────────────
                if (reviewList.isNotEmpty)
                  _section(
                    title: 'Yorumlar (${reviewList.length})',
                    child: Column(
                      children: reviewList
                          .take(5)
                          .map((r) => _ReviewTile(
                                review: r,
                                revieweeId: userId,
                                currentUserId: currentUserId,
                              ))
                          .toList(),
                    ),
                  ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bigStat({
    required String label,
    required String sub,
    required IconData icon,
    required Color iconColor,
  }) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(
                  fontSize: 18, fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          Text(sub, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _divider() => Container(width: 1, height: 40, color: Colors.grey.shade200);

  Widget _section({required String title, required Widget child}) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: valueColor ?? AppColors.textPrimary)),
      ],
    );
  }

  static String _memberSince(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
                      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return 'Üye: ${months[dt.month]} ${dt.year}';
    } catch (_) {
      return '';
    }
  }
}

class _ReviewTile extends ConsumerWidget {
  final Map<String, dynamic> review;
  final String revieweeId;
  final String? currentUserId;
  const _ReviewTile({
    required this.review,
    required this.revieweeId,
    required this.currentUserId,
  });

  Future<void> _openReplySheet(BuildContext context, WidgetRef ref) async {
    final reviewId = review['id'] as String?;
    if (reviewId == null) return;
    final existing = review['replyText'] as String?;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => ReviewReplySheet(
        reviewId: reviewId,
        existingText: existing,
      ),
    );
    if (saved == true) {
      ref.invalidate(publicProfileProvider(revieweeId));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewer  = review['reviewer'] as Map<String, dynamic>?;
    final name      = reviewer?['fullName']       as String? ?? 'Kullanıcı';
    final imgUrl    = reviewer?['profileImageUrl'] as String?;
    final rating    = (review['rating'] as num?)?.toInt() ?? 0;
    final comment   = review['comment']  as String? ?? '';
    final date      = review['createdAt'] as String?;
    final replyText = (review['replyText'] as String?)?.trim();
    final repliedAt = review['repliedAt'] as String?;
    final isOwner   = currentUserId != null && currentUserId == revieweeId;
    final hasReply  = replyText != null && replyText.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
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
                        fontSize: 13, color: AppColors.primary,
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
                            fontSize: 13, fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary)),
                    const Spacer(),
                    Row(
                      children: List.generate(
                        5,
                        (i) => Icon(
                          i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: Colors.amber,
                          size: 13,
                        ),
                      ),
                    ),
                  ],
                ),
                if (comment.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(comment,
                      style: const TextStyle(
                          fontSize: 13, height: 1.4,
                          color: AppColors.textSecondary)),
                ],
                if (date != null)
                  Text(_timeAgo(date),
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                if (hasReply) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.reply_rounded,
                                size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            const Expanded(
                              child: Text('Yanıt',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textSecondary)),
                            ),
                            if (isOwner)
                              GestureDetector(
                                onTap: () => _openReplySheet(context, ref),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(
                                      horizontal: 4, vertical: 2),
                                  child: Text('Düzenle',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w600)),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(replyText,
                            style: const TextStyle(
                                fontSize: 12.5,
                                height: 1.4,
                                color: AppColors.textSecondary)),
                        if (repliedAt != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(_timeAgo(repliedAt),
                                style: TextStyle(
                                    fontSize: 10.5,
                                    color: Colors.grey.shade400)),
                          ),
                      ],
                    ),
                  ),
                ] else if (isOwner) ...[
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => _openReplySheet(context, ref),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 0),
                        minimumSize: const Size(0, 28),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        foregroundColor: AppColors.primary,
                      ),
                      icon: const Icon(Icons.chat_bubble_outline_rounded,
                          size: 14),
                      label: const Text('Yanıtla',
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _timeAgo(String iso) {
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inDays > 30) {
        const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
                        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return '${months[dt.month]} ${dt.year}';
      }
      if (diff.inDays > 0) return '${diff.inDays} gün önce';
      if (diff.inHours > 0) return '${diff.inHours} saat önce';
      return 'Az önce';
    } catch (_) {
      return '';
    }
  }
}
