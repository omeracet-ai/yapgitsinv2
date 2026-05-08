import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/job_repository.dart';
import '../../data/offer_repository.dart';
import '../../../offers/widgets/offer_line_items_editor.dart';
import '../../../offers/widgets/offer_template_picker.dart';
import '../../../offers/widgets/offer_line_items_view.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/job_provider.dart';
import '../../../reviews/presentation/screens/write_review_screen.dart';
import '../../../photos/presentation/widgets/job_photo_picker.dart';
import '../widgets/completion_photos_section.dart';
import '../widgets/job_questions_tab.dart';
import '../widgets/job_video_player.dart';
import '../../../users/widgets/user_action_menu.dart';

class JobDetailScreen extends ConsumerStatefulWidget {
  final String? id;
  final String title;
  final String description;
  final String location;
  final String budget;
  final String category;
  final String postedAt;
  final IconData icon;
  final Color color;
  final bool isFeatured;
  final String? customerId;
  final List<String> photos;
  final List<String> videos;

  const JobDetailScreen({
    super.key,
    this.id,
    required this.title,
    required this.description,
    required this.location,
    required this.budget,
    required this.category,
    required this.postedAt,
    required this.icon,
    required this.color,
    this.isFeatured = false,
    this.customerId,
    this.photos = const [],
    this.videos = const [],
  });

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen>
    with SingleTickerProviderStateMixin {
  bool _actionLoading = false;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _doAction(Future<void> Function() action) async {
    setState(() => _actionLoading = true);
    try {
      await action();
      if (widget.id != null) ref.invalidate(jobOffersProvider(widget.id!));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showSnack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.success,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final currentUserId =
        authState is AuthAuthenticated ? authState.user['id'] as String? : null;
    final isOwner = widget.customerId != null && widget.customerId == currentUserId;

    final offersAsync = widget.id != null
        ? ref.watch(jobOffersProvider(widget.id!))
        : const AsyncValue<List<Map<String, dynamic>>>.data([]);

    // API'den tam detay çek (customer bilgisi dahil)
    final detailAsync = widget.id != null
        ? ref.watch(jobDetailProvider(widget.id!))
        : const AsyncValue<Map<String, dynamic>>.data({});
    final detail = detailAsync.valueOrNull ?? {};

    // Çözümlenen değerler — API'den gelenler widget parametrelerini geçersiz kılar
    final description = detail['description'] as String?  ?? widget.description;
    final budgetMin   = (detail['budgetMin']  as num?)?.toDouble();
    final budgetMax   = (detail['budgetMax']  as num?)?.toDouble();
    final jobStatus   = detail['status']      as String?  ?? 'open';
    final canMakeOffer = authState is AuthAuthenticated && !isOwner && jobStatus == 'open';
    final isWorker = offersAsync.valueOrNull?.any((o) => o['status'] == 'accepted' && o['user']?['id'] == currentUserId) ?? false;
    final customer    = detail['customer']    as Map<String, dynamic>?;
    final rawPhotos   = detail['photos']      as List?;
    final photos      = rawPhotos != null
        ? rawPhotos.cast<String>()
        : widget.photos;
    final createdAt   = detail['createdAt']   as String?;
    final dueDate     = detail['dueDate']     as String?;
    final rawVideos   = detail['videos']      as List?;
    final videos      = rawVideos != null
        ? rawVideos.cast<String>()
        : widget.videos;

    final statusMeta = _statusMeta(jobStatus);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('İş Detayı'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusMeta.$3.withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(statusMeta.$2, size: 13, color: Colors.white),
                const SizedBox(width: 4),
                Text(statusMeta.$1,
                    style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.local_offer_outlined, size: 16),
                  const SizedBox(width: 6),
                  offersAsync.when(
                    data: (o) => Text('Teklifler (${o.length})'),
                    loading: () => const Text('Teklifler'),
                    error: (_, __) => const Text('Teklifler'),
                  ),
                ],
              ),
            ),
            const Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.chat_bubble_outline, size: 16),
                  SizedBox(width: 6),
                  Text('Sorular'),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // İlan üst bilgileri (her iki sekmede de görünür)
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  _buildHeader(budgetMin: budgetMin, budgetMax: budgetMax, createdAt: createdAt, dueDate: dueDate),
                  if (customer != null) ...[
                    const SizedBox(height: 8),
                    _buildCustomerCard(customer),
                  ],
                  const SizedBox(height: 8),
                  _buildDescription(description),
                  if (photos.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _buildPhotosSection(photos),
                  ],
                  if (videos.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _buildVideosSection(videos),
                  ],
                  if (widget.id != null) ...[
                    const SizedBox(height: 8),
                    Builder(builder: (_) {
                      final initial = (detail['completionPhotos'] as List?)
                              ?.cast<String>() ??
                          const <String>[];
                      final canUpload = isWorker &&
                          (jobStatus == 'in_progress' ||
                              jobStatus == 'pending_completion');
                      return CompletionPhotosSection(
                        jobId: widget.id!,
                        initialPhotos: initial,
                        canUpload: canUpload,
                      );
                    }),
                  ],
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
          // Sekme içerikleri
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 0: Teklifler
                SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildOffersSection(offersAsync, canMakeOffer, currentUserId),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
                // Tab 1: Sorular
                widget.id != null
                    ? JobQuestionsTab(
                        jobId: widget.id!,
                        currentUserId: currentUserId,
                        isOwner: isOwner,
                        jobStatus: jobStatus,
                      )
                    : const Center(child: Text('İlan ID bulunamadı.')),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(
        isOwner: isOwner,
        canMakeOffer: canMakeOffer,
        jobStatus: jobStatus,
        isWorker: isWorker,
        detail: detail,
      ),
    );
  }

  /// (label, icon, color) tuple for job status
  (String, IconData, Color) _statusMeta(String status) {
    return switch (status) {
      'open'      => ('Açık',        Icons.circle,           Colors.green),
      'closed'    => ('Kapandı',     Icons.lock_outline,     Colors.orange),
      'completed' => ('Tamamlandı',  Icons.check_circle,     Colors.blue),
      'cancelled' => ('İptal',       Icons.cancel_outlined,  Colors.red),
      _           => ('Açık',        Icons.circle,           Colors.green),
    };
  }

  static String _timeAgo(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final dt   = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1)  return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk önce';
      if (diff.inHours   < 24) return '${diff.inHours} saat önce';
      if (diff.inDays    < 30) return '${diff.inDays} gün önce';
      return '${(diff.inDays / 30).floor()} ay önce';
    } catch (_) {
      return '';
    }
  }

  // ── Header ────────────────────────────────────────────────────────────────
  Widget _buildHeader({
    double? budgetMin,
    double? budgetMax,
    String? createdAt,
    String? dueDate,
  }) {
    // Bütçe gösterimi
    String budgetStr;
    if (budgetMin != null && budgetMax != null && budgetMax > budgetMin) {
      budgetStr = '${budgetMin.toInt()} – ${budgetMax.toInt()} ₺';
    } else if (budgetMin != null) {
      budgetStr = '${budgetMin.toInt()} ₺ ~';
    } else {
      budgetStr = widget.budget;
    }

    final postedStr = _timeAgo(createdAt) .isNotEmpty
        ? _timeAgo(createdAt)
        : widget.postedAt;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              height: 56, width: 56,
              decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16)),
              child: Icon(widget.icon, color: widget.color, size: 28),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.isFeatured)
                    Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.star_rounded, color: Colors.amber.shade700, size: 13),
                          const SizedBox(width: 4),
                          Text('Öne Çıkan',
                              style: TextStyle(fontSize: 11, color: Colors.amber.shade800,
                                  fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  Text(widget.title,
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: widget.color.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(20)),
                        child: Text(widget.category,
                            style: TextStyle(color: widget.color, fontSize: 12,
                                fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ]),

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 14),

          // Bilgi satırı: konum + zaman + teslim tarihi
          Row(children: [
            Flexible(child: _infoChip(Icons.location_on_outlined, widget.location, Colors.red.shade400)),
            const SizedBox(width: 20),
            Flexible(child: _infoChip(Icons.access_time_rounded, postedStr, Colors.grey.shade500)),
          ]),
          if (dueDate != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              Flexible(
                child: _infoChip(
                  Icons.event_outlined,
                  'Teslim: ${_formatDueDate(dueDate)}',
                  Colors.orange.shade600,
                ),
              ),
            ]),
          ],

          const SizedBox(height: 14),

          // Bütçe kartı
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary.withValues(alpha: 0.07),
                         AppColors.primary.withValues(alpha: 0.03)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.account_balance_wallet_rounded,
                    size: 20, color: AppColors.primary),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bütçe Aralığı',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    Text(budgetStr,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold,
                            color: AppColors.primary)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── İlanı Yayınlayan ──────────────────────────────────────────────────────
  Widget _buildCustomerCard(Map<String, dynamic> customer) {
    final name             = customer['fullName']        as String? ?? 'Kullanıcı';
    final imgUrl           = customer['profileImageUrl'] as String?;
    final rating           = (customer['averageRating']  as num?)?.toDouble() ?? 0.0;
    final reviews          = (customer['totalReviews']   as num?)?.toInt()    ?? 0;
    final city             = customer['city']            as String? ?? '';
    final since            = customer['createdAt']       as String?;
    final sinceStr         = since != null ? _memberSince(since) : '';
    final verified         = customer['identityVerified'] == true;
    final totalJobs        = (customer['asCustomerTotal']   as num?)?.toInt() ?? 0;
    final successJobs      = (customer['asCustomerSuccess'] as num?)?.toInt() ?? 0;
    final successRate      = totalJobs > 0 ? (successJobs / totalJobs * 100).round() : null;
    final customerId       = customer['id'] as String?;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('İlanı Yayınlayan',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary, letterSpacing: 0.3)),
          const SizedBox(height: 14),

          // Profil satırı
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar + doğrulama rozeti
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.primaryLight,
                    backgroundImage: imgUrl != null ? NetworkImage(imgUrl) : null,
                    child: imgUrl == null
                        ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                            style: const TextStyle(fontSize: 24,
                                color: AppColors.primary, fontWeight: FontWeight.bold))
                        : null,
                  ),
                  if (verified)
                    Positioned(
                      bottom: -2,
                      right: -2,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.verified_rounded,
                            color: AppColors.primary, size: 18),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),

              // İsim + meta
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name,
                              style: const TextStyle(fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis),
                        ),
                        if (verified) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('Doğrulandı',
                                style: TextStyle(fontSize: 10,
                                    color: AppColors.primary, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (city.isNotEmpty || sinceStr.isNotEmpty)
                      Row(
                        children: [
                          if (city.isNotEmpty) ...[
                            Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade500),
                            const SizedBox(width: 2),
                            Text(city, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                          ],
                          if (city.isNotEmpty && sinceStr.isNotEmpty)
                            Text('  ·  ', style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
                          if (sinceStr.isNotEmpty)
                            Text('Üye: $sinceStr',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // İstatistik satırı
          Row(
            children: [
              _statChip(
                icon: Icons.star_rounded,
                iconColor: Colors.amber,
                label: rating > 0 ? rating.toStringAsFixed(1) : '—',
                sublabel: '$reviews yorum',
              ),
              const SizedBox(width: 12),
              _statChip(
                icon: Icons.work_outline_rounded,
                iconColor: AppColors.primary,
                label: '$totalJobs',
                sublabel: 'İş ilanı',
              ),
              if (successRate != null) ...[
                const SizedBox(width: 12),
                _statChip(
                  icon: Icons.check_circle_outline_rounded,
                  iconColor: AppColors.success,
                  label: '%$successRate',
                  sublabel: 'Tamamlama',
                ),
              ],
            ],
          ),

          const SizedBox(height: 14),

          // Profili Gör butonu
          if (customerId != null)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/profile/$customerId'),
                icon: const Icon(Icons.person_outline_rounded, size: 16),
                label: const Text('Profili Gör'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _statChip({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String sublabel,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, color: iconColor, size: 18),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            Text(sublabel,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }

  static String _formatDueDate(String yyyyMmDd) {
    try {
      final parts = yyyyMmDd.split('-');
      if (parts.length != 3) return yyyyMmDd;
      final months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
                      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      final m = int.parse(parts[1]);
      return '${parts[2]} ${months[m]} ${parts[0]}';
    } catch (_) {
      return yyyyMmDd;
    }
  }

  static String _memberSince(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }

  Widget _buildDescription(String description) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('İş Açıklaması',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Text(description.isNotEmpty ? description : 'Açıklama girilmemiş.',
              style:
                  const TextStyle(color: AppColors.textSecondary, height: 1.6)),
        ],
      ),
    );
  }

  Widget _buildPhotosSection(List<String> photos) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('Fotoğraflar',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          PhotoGalleryView(photoUrls: photos, height: 200),
        ],
      ),
    );
  }

  Widget _buildVideosSection(List<String> videos) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text('Videolar',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 250,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              scrollDirection: Axis.horizontal,
              itemCount: videos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                return JobVideoPlayer(videoUrl: videos[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── Teklifler ─────────────────────────────────────────────────────────────
  Widget _buildOffersSection(
    AsyncValue<List<Map<String, dynamic>>> offersAsync,
    bool canMakeOffer,
    String? currentUserId,
  ) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          offersAsync.when(
            data: (offers) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Teklifler (${offers.length})',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    if (offers.any((o) => o['status'] == 'accepted'))
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.green.shade300),
                        ),
                        child: const Text('Teklif Kabul Edildi',
                            style: TextStyle(
                                color: Colors.green,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (offers.isEmpty)
                  const Text('Henüz teklif verilmemiş.',
                      style: TextStyle(color: AppColors.textHint))
                else
                  ...offers.map((o) => _buildOfferCard(o, canMakeOffer, currentUserId)),
              ],
            ),
            loading: () =>
                const Center(child: CircularProgressIndicator()),
            error: (err, _) => Text('Hata: $err',
                style: const TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _buildOfferCard(
    Map<String, dynamic> offer,
    bool canMakeOffer,
    String? currentUserId,
  ) {
    final userMap         = offer['user'] as Map<String, dynamic>?;
    final offerUserId     = offer['userId'] as String? ?? userMap?['id'] as String? ?? '';
    final name            = userMap?['fullName']        as String? ?? 'Teklif Sahibi';
    final workerBio       = userMap?['workerBio']       as String? ?? '';
    final identityVerified= userMap?['identityVerified'] == true;
    final hasDocument     = (userMap?['documentPhotoUrl'] as String?) != null;
    final avgRating       = (userMap?['averageRating']   as num?)?.toDouble() ?? 0.0;
    final totalReviews    = (userMap?['totalReviews']    as num?)?.toInt()    ?? 0;
    final wSuccess        = (userMap?['asWorkerSuccess'] as num?)?.toInt()    ?? 0;
    final wTotal          = (userMap?['asWorkerTotal']   as num?)?.toInt()    ?? 0;
    final wFail           = (userMap?['asWorkerFail']    as num?)?.toInt()    ?? 0;
    final successRate     = wTotal > 0 ? (wSuccess / wTotal * 100).round() : null;

    final offerId      = offer['id']            as String;
    final status       = offer['status']        as String? ?? 'pending';
    final price        = offer['price'];
    final counterPrice = offer['counterPrice'];
    final counterMessage = offer['counterMessage'] as String?;

    // Fiyat görünürlüğü: sadece ilan sahibi VEYA teklif sahibi görebilir
    final isOwnerView    = !canMakeOffer;
    final isOfferOwner   = currentUserId != null && currentUserId == offerUserId;
    final canSeePrice    = isOwnerView || isOfferOwner;
    final isCustomerView = isOwnerView;

    final Map<String, List<Color>> statusColors = {
      'pending':   [Colors.orange.shade100, Colors.orange.shade700],
      'accepted':  [Colors.green.shade100, Colors.green.shade700],
      'rejected':  [Colors.red.shade100, Colors.red.shade700],
      'countered': [Colors.blue.shade100, Colors.blue.shade700],
      'withdrawn': [Colors.grey.shade100, Colors.grey.shade600],
    };
    final statusLabels = {
      'pending':   'Beklemede',
      'accepted':  'Kabul Edildi',
      'rejected':  'Reddedildi',
      'countered': 'Pazarlık',
      'withdrawn': 'Geri Çekildi',
    };
    final sc = statusColors[status] ?? [Colors.grey.shade100, Colors.grey];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: status == 'accepted'
              ? Colors.green.shade400
              : status == 'countered'
                  ? Colors.blue.shade300
                  : AppColors.border,
          width: status == 'accepted' ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        children: [
          // Ana teklif satırı
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            leading: GestureDetector(
              onTap: null,
              child: Stack(
                children: [
                  CircleAvatar(
                    backgroundColor: AppColors.primaryLight,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (identityVerified)
                    Positioned(
                      right: 0, bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(1),
                        decoration: const BoxDecoration(
                            color: Colors.white, shape: BoxShape.circle),
                        child: const Icon(Icons.verified,
                            color: Colors.blue, size: 14),
                      ),
                    ),
                ],
              ),
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                if (!isOfferOwner && offerUserId.isNotEmpty)
                  SizedBox(
                    width: 32, height: 32,
                    child: UserActionMenu(userId: offerUserId, userName: name),
                  ),
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: sc[0],
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    statusLabels[status] ?? status,
                    style: TextStyle(
                        color: sc[1],
                        fontSize: 11,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Rozet satırı: mavi tik + belge + doğrulanmamış uyarı
                const SizedBox(height: 4),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  if (identityVerified)
                    _badgeChip(Icons.verified, 'Kimliği Doğrulandı', Colors.blue)
                  else
                    _badgeChip(Icons.warning_amber_rounded, 'Doğrulanmamış', Colors.orange),
                  if (hasDocument)
                    _badgeChip(Icons.workspace_premium_outlined, 'Yeterlilik Belgesi', Colors.green),
                ]),
                const SizedBox(height: 6),
                // İstatistikler
                Row(children: [
                  if (avgRating > 0) ...[
                    const Icon(Icons.star_rounded, color: Colors.amber, size: 13),
                    const SizedBox(width: 2),
                    Text('${avgRating.toStringAsFixed(1)} ($totalReviews yorum)',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    const SizedBox(width: 10),
                  ],
                  if (successRate != null) ...[
                    Icon(Icons.trending_up_rounded, size: 13, color: Colors.green.shade600),
                    const SizedBox(width: 2),
                    Text('$successRate% başarı ($wSuccess/$wTotal)',
                        style: TextStyle(fontSize: 11, color: Colors.green.shade700)),
                  ] else if (wTotal == 0)
                    Text('Henüz iş geçmişi yok',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                ]),
                if (wFail > 0) ...[
                  const SizedBox(height: 2),
                  Text('$wFail başarısız iş',
                      style: TextStyle(fontSize: 10, color: Colors.red.shade400)),
                ],
                if (workerBio.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(workerBio, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
                if (offer['message'] != null && offer['message'].toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(offer['message'].toString(), maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
                ],
                const SizedBox(height: 6),
                // Fiyat — sadece ilan sahibi veya teklif sahibi görür
                if (canSeePrice)
                  Text('$price ₺',
                      style: const TextStyle(color: AppColors.primary,
                          fontWeight: FontWeight.bold, fontSize: 16))
                else
                  Row(children: [
                    const Icon(Icons.lock_outline, size: 14, color: AppColors.textHint),
                    const SizedBox(width: 4),
                    Text('Teklif tutarı gizlidir',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500,
                            fontStyle: FontStyle.italic)),
                  ]),
                if (canSeePrice && offer['lineItems'] is List && (offer['lineItems'] as List).isNotEmpty)
                  OfferLineItemsView(
                    items: (offer['lineItems'] as List)
                        .whereType<Map>()
                        .map((m) => Map<String, dynamic>.from(m))
                        .toList(),
                  ),
              ],
            ),
          ),

          // Pazarlık detayı
          if (status == 'countered' && counterPrice != null && canSeePrice)
            Container(
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.handshake_outlined,
                      color: Colors.blue, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Müşteri teklifi: $counterPrice ₺',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                              fontSize: 13),
                        ),
                        if (counterMessage != null &&
                            counterMessage.isNotEmpty)
                          Text(counterMessage,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Müşteri aksiyon butonları (status == pending veya countered'de provider için)
          if (isCustomerView &&
              (status == 'pending' || status == 'countered') &&
              widget.id != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(
                children: [
                  // Kabul Et
                  Expanded(
                    child: _ActionButton(
                      label: 'Kabul Et',
                      icon: Icons.check_circle_outline,
                      color: Colors.green,
                      loading: _actionLoading,
                      onTap: () => _doAction(() async {
                        await ref
                            .read(offerRepositoryProvider)
                            .acceptOffer(widget.id!, offerId);
                        _showSnack('Teklif kabul edildi!');
                        ref.read(jobsProvider.notifier).fetchJobs();
                      }),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Pazarlık
                  Expanded(
                    child: _ActionButton(
                      label: 'Pazarlık',
                      icon: Icons.handshake_outlined,
                      color: Colors.blue,
                      loading: _actionLoading,
                      onTap: () =>
                          _showCounterDialog(offerId, price?.toString() ?? ''),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Reddet
                  Expanded(
                    child: _ActionButton(
                      label: 'Reddet',
                      icon: Icons.cancel_outlined,
                      color: Colors.red,
                      loading: _actionLoading,
                      onTap: () => _doAction(() async {
                        await ref
                            .read(offerRepositoryProvider)
                            .rejectOffer(widget.id!, offerId);
                        _showSnack('Teklif reddedildi.');
                      }),
                    ),
                  ),
                ],
              ),
            ),

          // Değerlendirme butonu (müşteri, kabul edilmiş teklif)
          if (isCustomerView && status == 'accepted' && widget.id != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: Icon(Icons.star_outline, size: 16, color: Colors.amber.shade700),
                  label: Text('Değerlendir',
                      style: TextStyle(color: Colors.amber.shade700, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.amber.shade400),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: () {
                    final auth = ref.read(authStateProvider);
                    if (auth is! AuthAuthenticated) {
                      context.push('/giris-yap');
                      return;
                    }
                    final revieweeUserId = userMap?['id'] as String?;
                    if (revieweeUserId == null) return;
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      shape: const RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (_) => WriteReviewSheet(
                        revieweeId: revieweeUserId,
                        revieweeName: name,
                        jobId: widget.id,
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── Bottom Bar ────────────────────────────────────────────────────────────
  Widget _buildBottomBar({
    required bool isOwner,
    required bool canMakeOffer,
    required String jobStatus,
    required bool isWorker,
    required Map<String, dynamic> detail,
  }) {
    if (jobStatus == 'in_progress') {
      if (isOwner) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
          ),
          child: ElevatedButton.icon(
            onPressed: () {
              _showSnack('QR kod oluşturuluyor...');
              // Backend generate-qr çağrısı buraya eklenecek
            },
            icon: const Icon(Icons.qr_code, color: Colors.white),
            label: const Text('İş Tamamlama QR Kodunu Göster',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        );
      } else if (isWorker) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
          ),
          child: ElevatedButton.icon(
            onPressed: () {
              _showSnack('Kamera açılıyor...');
              // Backend verify-qr ve complete çağrısı buraya eklenecek
            },
            icon: const Icon(Icons.camera_alt_outlined, color: Colors.white),
            label: const Text('İşi Tamamla (QR Okut & Medya Ekle)',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        );
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)],
      ),
      child: isOwner
              ? Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showUpdateJobDialog(),
                        icon: const Icon(Icons.edit_outlined),
                        label: const Text('Güncelle'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _confirmDeleteJob(),
                        icon: const Icon(Icons.delete_outline),
                        label: const Text('Kaldır'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.error,
                          side: const BorderSide(color: AppColors.error),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                )
              : canMakeOffer
                  ? ElevatedButton.icon(
                      onPressed: () => _showBidDialog(),
                      icon: const Icon(Icons.send, color: Colors.white),
                      label: const Text('Teklif Ver',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        minimumSize: const Size(double.infinity, 52),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    )
                  : const SizedBox.shrink(),
    );
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────
  void _showBidDialog() {
    final priceCtrl = TextEditingController();
    final msgCtrl = TextEditingController();
    final lineItemsRef = <List<Map<String, dynamic>>>[[]];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _BidSheet(
        title: 'Teklif Ver',
        priceLabel: 'Fiyatınız (₺)',
        priceCtrl: priceCtrl,
        msgCtrl: msgCtrl,
        submitLabel: 'Gönder',
        showLineItems: true,
        onLineItemsChanged: (items) => lineItemsRef[0] = items,
        onSubmit: () async {
          if (widget.id == null || priceCtrl.text.isEmpty) return;
          final price = double.parse(priceCtrl.text.replaceAll(',', '.'));
          final items = lineItemsRef[0]
              .where((m) =>
                  (m['label'] ?? '').toString().trim().isNotEmpty &&
                  ((m['qty'] as num?) ?? 0) > 0 &&
                  ((m['unitPrice'] as num?) ?? 0) > 0)
              .toList();
          if (items.isNotEmpty) {
            final sum = items.fold<double>(
                0.0, (s, m) => s + ((m['total'] as num?)?.toDouble() ?? 0));
            if ((sum - price).abs() > 1.0) {
              throw Exception(
                  'Kalemler toplamı: ₺${sum.toStringAsFixed(2)} — fiyat: ₺${price.toStringAsFixed(2)}. Devam etmek için fiyatı eşitle.');
            }
          }
          await ref.read(offerRepositoryProvider).createOffer(
                widget.id!,
                price,
                msgCtrl.text,
                lineItems: items.isEmpty ? null : items,
              );
          if (widget.id != null) ref.invalidate(jobOffersProvider(widget.id!));
          if (ctx.mounted) Navigator.pop(ctx);
          _showSnack('Teklifiniz gönderildi!');
        },
      ),
    );
  }

  void _showCounterDialog(String offerId, String currentPrice) {
    final priceCtrl =
        TextEditingController(text: currentPrice.replaceAll(' ₺', ''));
    final msgCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _BidSheet(
        title: 'Pazarlık Yap',
        priceLabel: 'Karşı Teklifiniz (₺)',
        priceCtrl: priceCtrl,
        msgCtrl: msgCtrl,
        submitLabel: 'Pazarlık Gönder',
        msgLabel: 'Kısa notunuz',
        onSubmit: () async {
          if (widget.id == null || priceCtrl.text.isEmpty) return;
          await ref.read(offerRepositoryProvider).counterOffer(
                widget.id!,
                offerId,
                double.parse(priceCtrl.text),
                msgCtrl.text,
              );
          if (widget.id != null) ref.invalidate(jobOffersProvider(widget.id!));
          if (ctx.mounted) Navigator.pop(ctx);
          _showSnack('Pazarlık teklifiniz gönderildi!');
        },
      ),
    );
  }

  void _showUpdateJobDialog() {
    // API'den gelen detail verisini kullan
    final detailAsync = widget.id != null
        ? ref.read(jobDetailProvider(widget.id!))
        : const AsyncValue<Map<String, dynamic>>.data({});
    final detail = detailAsync.valueOrNull ?? {};

    final titleCtrl    = TextEditingController(text: widget.title);
    final descCtrl     = TextEditingController(
        text: detail['description'] as String? ?? widget.description);
    final locationCtrl = TextEditingController(text: widget.location);
    final budgetMinCtrl = TextEditingController(
        text: (detail['budgetMin'] as num?)?.toInt().toString() ?? '');
    final budgetMaxCtrl = TextEditingController(
        text: (detail['budgetMax'] as num?)?.toInt().toString() ?? '');
    String currentCategory = widget.category;

    final categories = [
      'Temizlik','Boya & Badana','Tesisat','Elektrikçi','Nakliyat',
      'Mobilya Montaj','Bahçe & Peyzaj','Klima & Isıtma','Zemin & Parke',
      'Çatı & Yalıtım','Marangoz & Ahşap','Cam & Doğrama','Alçıpan & Asma Tavan',
      'Güvenlik Sistemleri','Bilgisayar & IT','Grafik & Tasarım','Web & Yazılım',
      'Fotoğraf & Video','Düğün & Organizasyon','Özel Ders & Eğitim',
      'Sağlık & Güzellik','Evcil Hayvan','Araç & Oto Bakım',
      'Haşere Kontrolü','Havuz & Spa','Çilingir & Kilit',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(child: Container(width: 40, height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                const Text('İlanı Güncelle',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),

                _updateField(titleCtrl, 'Başlık *', Icons.title),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 4,
                  maxLength: 1000,
                  decoration: InputDecoration(
                    labelText: 'Açıklama',
                    prefixIcon: const Icon(Icons.description_outlined),
                    alignLabelWithHint: true,
                    filled: true, fillColor: AppColors.background,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade200)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade200)),
                  ),
                ),
                const SizedBox(height: 12),
                _updateField(locationCtrl, 'Konum', Icons.location_on_outlined),
                const SizedBox(height: 12),

                // Kategori dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: categories.contains(currentCategory) ? currentCategory : null,
                      hint: Text('Kategori: $currentCategory'),
                      isExpanded: true,
                      items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) => setModalState(() => currentCategory = v ?? currentCategory),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Bütçe aralığı
                Row(children: [
                  Expanded(child: _updateField(budgetMinCtrl, 'Min Bütçe (₺)',
                      Icons.arrow_downward_rounded, kb: TextInputType.number)),
                  const SizedBox(width: 10),
                  Expanded(child: _updateField(budgetMaxCtrl, 'Max Bütçe (₺)',
                      Icons.arrow_upward_rounded, kb: TextInputType.number)),
                ]),

                const SizedBox(height: 24),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: const Text('İptal'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        if (titleCtrl.text.trim().isEmpty) return;
                        Navigator.pop(ctx);
                        if (widget.id == null) return;
                        await _doAction(() async {
                          final bMin = double.tryParse(budgetMinCtrl.text);
                          final bMax = double.tryParse(budgetMaxCtrl.text);
                          await ref.read(offerRepositoryProvider).updateJob(
                            widget.id!,
                            {
                              'title':       titleCtrl.text.trim(),
                              'description': descCtrl.text.trim(),
                              if (locationCtrl.text.trim().isNotEmpty)
                                'location':  locationCtrl.text.trim(),
                              'category':    currentCategory,
                              if (bMin != null) 'budgetMin': bMin,
                              if (bMax != null) 'budgetMax': bMax,
                            },
                          );
                          _showSnack('İlan güncellendi!');
                          ref.read(jobsProvider.notifier).fetchJobs();
                          if (widget.id != null) ref.invalidate(jobDetailProvider(widget.id!));
                        });
                      },
                      icon: const Icon(Icons.save_outlined, size: 18),
                      label: const Text('Kaydet'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _updateField(TextEditingController ctrl, String label, IconData icon,
      {TextInputType kb = TextInputType.text}) {
    return TextField(
      controller: ctrl,
      keyboardType: kb,
      textCapitalization: TextCapitalization.sentences,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true, fillColor: AppColors.background,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      ),
    );
  }

  void _confirmDeleteJob() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('İlanı Kaldır'),
        content: const Text(
            'Bu ilanı kalıcı olarak silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Vazgeç')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              if (widget.id == null) return;
              await _doAction(() async {
                await ref
                    .read(offerRepositoryProvider)
                    .deleteJob(widget.id!);
                _showSnack('İlan kaldırıldı.');
                ref.read(jobsProvider.notifier).fetchJobs();
                if (mounted) Navigator.pop(context);
              });
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
  }

  Widget _badgeChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 3),
          Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label, Color iconColor) {
    return Row(children: [
      Icon(icon, size: 14, color: iconColor),
      const SizedBox(width: 4),
      Flexible(
        child: Text(label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style:
                const TextStyle(fontSize: 13, color: AppColors.textHint)),
      ),
    ]);
  }
}

// ── Yardımcı Widgetlar ────────────────────────────────────────────────────
class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool loading;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _BidSheet extends StatefulWidget {
  final String title, priceLabel, submitLabel;
  final String msgLabel;
  final TextEditingController priceCtrl, msgCtrl;
  final Future<void> Function() onSubmit;
  final bool showLineItems;
  final ValueChanged<List<Map<String, dynamic>>>? onLineItemsChanged;

  const _BidSheet({
    required this.title,
    required this.priceLabel,
    required this.priceCtrl,
    required this.msgCtrl,
    required this.submitLabel,
    required this.onSubmit,
    this.msgLabel = 'Mesajınız',
    this.showLineItems = false,
    this.onLineItemsChanged,
  });

  @override
  State<_BidSheet> createState() => _BidSheetState();
}

class _BidSheetState extends State<_BidSheet> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 24, right: 24, top: 24),
      child: SingleChildScrollView(
        child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),
          Text(widget.title,
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          TextField(
            controller: widget.priceCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
                labelText: widget.priceLabel,
                prefixIcon: const Icon(Icons.attach_money),
                filled: true),
          ),
          const SizedBox(height: 14),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () async {
                final picked =
                    await OfferTemplatePickerSheet.show(context);
                if (picked != null && picked.isNotEmpty) {
                  widget.msgCtrl.text = picked;
                  widget.msgCtrl.selection = TextSelection.fromPosition(
                      TextPosition(offset: picked.length));
                }
              },
              icon: const Icon(Icons.bookmark_outline, size: 18),
              label: const Text('Şablon Seç'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
          TextField(
            controller: widget.msgCtrl,
            maxLines: 2,
            maxLength: 200,
            decoration: InputDecoration(
                labelText: widget.msgLabel,
                prefixIcon: const Icon(Icons.message_outlined),
                alignLabelWithHint: true,
                filled: true),
          ),
          if (widget.showLineItems) ...[
            const SizedBox(height: 8),
            Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 8),
                title: const Text('Kalem Bazlı Detay (opsiyonel)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                children: [
                  OfferLineItemsEditor(
                    onChanged: widget.onLineItemsChanged ?? (_) {},
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading
                  ? null
                  : () async {
                      setState(() => _loading = true);
                      final messenger = ScaffoldMessenger.of(context);
                      try {
                        await widget.onSubmit();
                      } catch (e) {
                        if (mounted) {
                          messenger.showSnackBar(SnackBar(
                            content: Text(e
                                .toString()
                                .replaceFirst('Exception: ', '')),
                            backgroundColor: AppColors.error,
                          ));
                        }
                      } finally {
                        if (mounted) setState(() => _loading = false);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2)
                  : Text(widget.submitLabel,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
      ),
    );
  }
}
