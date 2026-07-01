import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/app_config/app_config_provider.dart';
import '../../../../core/app_config/app_config_visibility.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../profile/data/user_profile_repository.dart';
import '../../../users/widgets/user_action_menu.dart';
import '../../../chat/data/presence_provider.dart';
import '../../../../core/widgets/info_hint.dart';
import '../providers/auth_provider.dart';
import '../../widgets/portfolio_gallery.dart';
import '../../widgets/intro_video_section.dart';
// Phase 419 — portfolio_grid + verified_category_badges import'ları kaldırıldı.
// Phase 491 — review_reply_sheet + review_summary_card import'ları kaldırıldı
// (yorumlar Performans Paneli içinde gösteriliyor).
import '../../widgets/availability_editor_sheet.dart';
import 'package:go_router/go_router.dart';

final publicProfileProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
  (ref, userId) async {
    return ref.read(userProfileRepositoryProvider).getPublicProfile(userId);
  },
);

/// Phase 211 — public availability slots for a worker
final publicAvailabilitySlotsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>(
  (ref, userId) async {
    return ref
        .read(userProfileRepositoryProvider)
        .getPublicAvailability(userId);
  },
);

class PublicProfileScreen extends ConsumerWidget {
  final String userId;

  /// Phase 540d — Yalnızca "Hızlı Hizmet Verenlere Ulaş" akışından açılan
  /// worker profillerinde alt "Hizmet teklifi ver" CTA görünür. Diğer
  /// entry point'lerde (harita worker pin, direktori, teklif veren usta
  /// linki, kendi profil ziyaretçileri) buton gizlenir.
  final bool quickConnect;

  const PublicProfileScreen({
    super.key,
    required this.userId,
    this.quickConnect = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(publicProfileProvider(userId));
    return profileAsync.when(
      loading: () => Scaffold(
        body: ListSkeleton(itemCount: 4, itemBuilder: (_) => const ProviderCardSkeleton()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Profil')),
        body: Center(child: Text(e.toString())),
      ),
      data: (data) => _ProfileView(
          data: data, userId: userId, quickConnect: quickConnect),
    );
  }
}

class _ProfileView extends ConsumerWidget {
  final Map<String, dynamic> data;
  final String userId;
  final bool quickConnect;
  const _ProfileView({
    required this.data,
    required this.userId,
    required this.quickConnect,
  });

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
    // Phase 322 — reputation chip kaldırıldı (3-metrik analizine geçildi).
    // ignore: unused_local_variable
    final reputation      = (data['reputationScore'] as num?)?.toInt()    ?? 0;
    final verified        = data['identityVerified'] == true;
    // Phase 472 — customer stat'leri 3-metrik şeridi kaldırılınca unused;
    // ileride Hizmet Alan görünümü eklenirse geri açılır.
    final totalWorker     = (data['asWorkerTotal']     as num?)?.toInt() ?? 0;
    final successWorker   = (data['asWorkerSuccess']   as num?)?.toInt() ?? 0;
    final since           = data['createdAt']        as String?;
    final workerCats      = (data['workerCategories'] as List?)?.cast<String>() ?? [];
    final pastPhotos      = (data['pastPhotos']       as List?)?.cast<String>() ?? [];
    // Phase 506 — Hizmet Alan (asCustomer) past completed jobs özet listesi.
    // Backend `pastJobsAsCustomer` array döner; item: {id,title,category,completedAt,photoUrl}.
    final pastJobsAsCustomer = ((data['pastJobsAsCustomer'] as List?) ?? const [])
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    final portfolioPhotos = (data['portfolioPhotos']  as List?)?.cast<String>() ?? [];
    // Phase 419 — portfolioVideos kaldırıldı (video desteği bitti).
    final introVideoUrl   = data['introVideoUrl']     as String?;
    final introVideoDur   = (data['introVideoDuration'] as num?)?.toInt();
    // Phase 265d — defensive: bazı kayıtlar reviewer field'ını string
    // verebilir; whereType<Map> ile filtrele, sonra Map.from ile copy.
    final reviewList      = ((data['reviews'] as List?) ?? const [])
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
    final badges          = data['badges']            as List?;
    final isWorker        = workerCats.isNotEmpty;
    // Phase 211 — slot-based availability
    final availSlotsAsync = ref.watch(publicAvailabilitySlotsProvider(userId));

    // Admin paneldeki /profile-card ekranından gelen field visibility
    // konfigürasyonu. Kural yoksa varsayılan true (geriye dönük uyumlu).
    final appCfg = ref.watch(appConfigSyncProvider);
    // Phase 472 — showRating de unused (üst metrik şeridi kaldırıldı).
    // Phase 472 — showReviews/showJobs hâlâ Performans Paneli içinde
    // dolaylı okunuyor (BadgesMiniStats); showCompletion/showReputation
    // kullanılmıyor (3-metrik şeridi kaldırıldı).
    final showBadges      = isProfileFieldVisible('badges',          appCfg);
    final showVerified    = isProfileFieldVisible('verifiedBadge',   appCfg);
    // Phase 271+: workerSkills bu ekranda ayrı bir blok değil; ileride
    // eklendiğinde `isProfileFieldVisible('workerSkills', appCfg)` ile
    // sarmalanmalı. Şimdilik unused warning'i önlemek için no-op.
    // ignore: unused_local_variable
    final showSkills      = isProfileFieldVisible('workerSkills',    appCfg);
    final showPortfolio   = isProfileFieldVisible('portfolioPhotos', appCfg);

    return Scaffold(
      backgroundColor: AppColors.background,
      // Phase 472 — Sticky Action Bar: Mesaj butonu kaldırıldı,
      // tek "Hizmet teklifi ver" CTA full-width.
      bottomNavigationBar: (isWorker && !isSelf && quickConnect)
          ? SafeArea(
              top: false,
              minimum: const EdgeInsets.fromLTRB(12, 4, 12, 10),
              child: Material(
                color: AppColors.surface,
                elevation: 8,
                shadowColor: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.send_rounded,
                          size: 18, color: Colors.white),
                      label: const Text('Hizmet teklifi ver',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        if (currentUserId == null) {
                          context.push('/giris-yap',
                              extra: {'returnTo': '/profil/$userId'});
                          return;
                        }
                        context.push('/ilan-ver', extra: {
                          'targetWorkerId': userId,
                          'targetWorkerName': name,
                          if (workerCats.isNotEmpty) ...{
                            'initialCategory': workerCats.first,
                            'allowedCategories': workerCats,
                          },
                        });
                      },
                    ),
                  ),
                ),
              ),
            )
          : null,
      body: RefreshIndicator(
        color: AppColors.primary,
        displacement: 50,
        onRefresh: () async {
          ref.invalidate(publicProfileProvider(userId));
          await ref.read(publicProfileProvider(userId).future);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
          // ── Hero header — full-bleed gradient, 40% screen height ─────────
          SliverAppBar(
            // Phase 420 — Compact header: 40% → ~22% ekran yüksekliği.
            // Hero kart önceki dev gradient panel yerine kompakt bir avatar +
            // ad + tek satır meta. Görsel hiyerarşi içerik lehine düzeltildi.
            expandedHeight: 210,
            pinned: true,
            backgroundColor: AppColors.headerBackground(context),
            actions: [
              // Phase 492 — şimşek sağ kenara hizalı, 3-nokta menü hemen
              // soluna. AppBar.actions sıralaması: ilk öğe sola, son öğe
              // sağ kenara. Bu yüzden önce UserActionMenu, sonra _PresenceSignal.
              if (!isSelf)
                UserActionMenu(
                  userId: userId,
                  userName: name,
                  iconColor: Colors.white,
                ),
              // Phase 475 — Presence signal kendi profilinde de görünür
              // (kullanıcı test edebilsin); UserActionMenu sadece başkasının
              // profilinde görünür (kendine şikayet/blok anlamsız).
              _PresenceSignal(userId: userId, forceOnline: isSelf),
            ],
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Gradient background
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [AppColors.primary, AppColors.primaryDark],
                      ),
                    ),
                  ),
                  // Bottom fade overlay for readability
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.35),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Content — Phase 420 kompakt
                  SafeArea(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                      const SizedBox(height: 8),
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 8,
                                  offset: Offset(0, 3),
                                ),
                              ],
                            ),
                            child: CircleAvatar(
                              radius: 36,
                              backgroundColor: Colors.white24,
                              backgroundImage:
                                  imgUrl != null ? NetworkImage(imgUrl) : null,
                              child: imgUrl == null
                                  ? Text(
                                      name.isNotEmpty ? trUpper(name[0]) : '?',
                                      style: const TextStyle(
                                          fontSize: 28,
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold))
                                  : null,
                            ),
                          ),
                          if (verified && showVerified)
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(color: AppColors.surface,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.verified_rounded,
                                    color: AppColors.primary, size: 16),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(name,
                              style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white)),
                          if (verified && showVerified) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified_rounded,
                                color: Colors.white, size: 14),
                          ],
                        ],
                      ),
                      // Phase 420 — city + üyelik tek satırda nokta ayraçlı.
                      if (city.isNotEmpty || since != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (city.isNotEmpty) ...[
                                const Icon(Icons.location_on_outlined,
                                    size: 11, color: Colors.white70),
                                const SizedBox(width: 2),
                                Text(city,
                                    style: const TextStyle(
                                        fontSize: 11, color: Colors.white70)),
                              ],
                              if (city.isNotEmpty && since != null)
                                const Text(' · ',
                                    style: TextStyle(
                                        fontSize: 11, color: Colors.white54)),
                              if (since != null)
                                Text(_memberSince(since),
                                    style: const TextStyle(
                                        fontSize: 11, color: Colors.white70)),
                            ],
                          ),
                        ),
                      // Phase 468 — Eski stale online indicator kaldırıldı.
                      // Canlı sinyal artık AppBar.actions içinde
                      // (_PresenceSignal — peerPresenceProvider).
                    ],        // Column children
                    ),        // Column
                  ),          // SafeArea
                ],            // Stack children
              ),              // Stack (background)
            ),                // FlexibleSpaceBar
          ),                  // SliverAppBar

          // Phase 468 — Verification Center + Hizmet Veren/Alan TabBar
          // kaldırıldı (hatalar.txt revize). Worker content doğrudan render.
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Phase 472 — Açıklama üstündeki 3-metrik istatistik şeridi
                // kaldırıldı. Tüm metrikler artık "Performans Paneli" altında.
                const SizedBox(height: 8),

                // ── Rozetler ─────────────────────────────────────────────
                // Phase 422 — Filter sonrası boş kalan rozet listesinde
                // section başlığı bile gizli. BadgeRow Phase 418'de
                // "Doğrulanmış" eliyor; sadece o rozet varsa bölüm boş
                // kalıyordu.
                // Phase 468 — Kullanıcı Açıklaması Rozetler'in ÜSTÜNE taşındı.
                if (bio != null && bio.isNotEmpty) ...[
                  Container(
                    color: AppColors.surface,
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(children: [
                          Icon(Icons.info_outline,
                              size: 14, color: AppColors.primary),
                          SizedBox(width: 6),
                          Text('Kullanıcı Açıklaması',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                  letterSpacing: 0.2)),
                        ]),
                        const SizedBox(height: 6),
                        Text(bio,
                            style: TextStyle(
                                fontSize: 13,
                                height: 1.45,
                                color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],

                // Phase 470 — Rozetler artık collapsible (dropdown).
                // Mini stat pill'leri tap → detay bottom sheet.
                if (showBadges) ...[
                  PerformancePanel(
                    reviews: reviews,
                    rating: rating,
                    successWorker: successWorker,
                    totalWorker: totalWorker,
                    categories: workerCats,
                    bio: bio,
                    reviewList: reviewList,
                    badges: _hasVisibleBadges(badges)
                        ? (badges as List)
                        : const <dynamic>[],
                    certifications:
                        ((data['certifications'] as List?) ?? const [])
                            .whereType<Map>()
                            .map((m) => Map<String, dynamic>.from(m))
                            .toList(),
                  ),
                  const SizedBox(height: 8),
                ],

                // Phase 473 — "Belge ile Doğrulanmış" WorkerDocumentsCard
                // bölümü kaldırıldı. Kategoriler + açıklama artık
                // Performans Paneli → "Verdiği hizmet" detay sheet'inde.

                // Phase 315 — "Bu Ustaya Teklif Ver" CTA artık scroll
                // gövdesinin dışında, Scaffold.bottomNavigationBar slot'unda
                // sabit duruyor. Sayfa scroll edilse bile buton ekranın
                // en altında kalır → kullanıcı için her zaman ulaşılabilir,
                // iç-içe scroll çakışması da azalır.

                // ── Müsaitlik (Phase 211) ─────────────────────────────────
                if (isWorker)
                  availSlotsAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (slots) => slots.isEmpty
                        ? const SizedBox.shrink()
                        : Column(
                            children: [
                              _section(
                                title: 'Müsaitlik',
                                child: AvailabilityChips(slots: slots),
                              ),
                              const SizedBox(height: 8),
                            ],
                          ),
                  ),

                // Phase 422 — 'İstatistikler' bölümü kaldırıldı (kullanıcı
                // isteği). Üstteki _bigStat satırı (Tamamlanan/Başarı/Puan)
                // zaten özet veriyor; aşağıdaki detay tekrar oluyordu.

                // ── Tanıtım Videosu (Phase 152) ──────────────────────────
                if (introVideoUrl != null && introVideoUrl.isNotEmpty) ...[
                  _section(
                    title: 'Tanıtım',
                    child: IntroVideoPlayer(
                      url: introVideoUrl,
                      durationSeconds: introVideoDur,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Portfolyo ────────────────────────────────────────────
                // Phase 421 — Public profile salt-okunur: upload tile burada
                // gizli (isOwner=false). Sahibi Profil sekmesi → "Portfolyom"
                // ekranından foto ekler/siler.
                if (showPortfolio && portfolioPhotos.isNotEmpty) ...[
                  _section(
                    title: 'Portfolyo',
                    child: PortfolioGallery(
                      photos: portfolioPhotos,
                      isOwner: false,
                      userId: userId,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // ── Geçmiş fotoğraflar ────────────────────────────────────
                if (showPortfolio && pastPhotos.isNotEmpty) ...[
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

                // ── Phase 506 — Hizmet Aldıkları (asCustomer past jobs) ──
                // Bu kullanıcının müşteri rolünde aldığı tamamlanmış hizmetler.
                // Collapsible card — varsayılan kapalı, tap → ilan detayı.
                if (pastJobsAsCustomer.isNotEmpty) ...[
                  _CustomerPastJobsCard(jobs: pastJobsAsCustomer),
                  const SizedBox(height: 8),
                ],

                // Phase 491 — AI Yorum Özeti + yorum listesi public profile'dan
                // kaldırıldı. Yorumlar Performans Paneli içinde gösteriliyor.

                // ── Phase 119: Sigortalı rozeti ─────────────────────────
                if (data['insurance'] is Map) ...[
                  const SizedBox(height: 12),
                  Builder(builder: (_) {
                    final ins = Map<String, dynamic>.from(data['insurance'] as Map);
                    final provider = (ins['provider'] ?? '') as String;
                    final coverage = ((ins['coverageAmount'] as num?) ?? 0).toInt();
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: Row(children: [
                        const Text('🛡️', style: TextStyle(fontSize: 24)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Sigortalı',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.success)),
                              const SizedBox(height: 2),
                              Text('$provider · $coverage₺ teminat',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ]),
                    );
                  }),
                ],

                // Phase 474 — "📜 Sertifikalar" bölümü kaldırıldı.
                // Sertifika rozeti BadgeRow içinde, tap → detay sheet.

                // Phase 419 — "İş Örnekleri" + portfolyo videosu bölümü
                // kaldırıldı (kullanıcı isteği). Kart başlığındaki
                // portfolyo grid + video alanı yerine sadece yorumlar +
                // tamamlanan işler özetleniyor.
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
        ),
      ),
    );
  }

  /// Phase 422 — BadgeRow filter (key='verified' / label='doğrulanmış')
  /// uygulandıktan sonra görünür rozet kaldı mı? `null` veya boş liste de
  /// false döner — section başlığı çizilmesin.
  static bool _hasVisibleBadges(List? raw) {
    if (raw == null || raw.isEmpty) return false;
    for (final b in raw) {
      if (b is! Map) continue;
      final label = (b['label'] ?? '').toString();
      if (label.isEmpty) continue;
      final key = (b['key'] ?? '').toString().toLowerCase();
      if (key == 'verified' || label.toLowerCase() == 'doğrulanmış') continue;
      return true;
    }
    return false;
  }

  Widget _section({required String title, required Widget child}) {
    return Container(color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          child,
        ],
      ),
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

// Phase 491 — _ReviewTile public profile'dan kaldırıldı.
// Performans Paneli içinde yorumlar tam görünüyor.
/*
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
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
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
    // Phase 265d — reviewer string ya da Map gelebilir; defensive cast.
    final reviewerRaw = review['reviewer'];
    final reviewer = reviewerRaw is Map
        ? Map<String, dynamic>.from(reviewerRaw)
        : null;
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
                ? Text(name.isNotEmpty ? trUpper(name[0]) : '?',
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
                        style: TextStyle(
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
                      style: TextStyle(
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
                            Icon(Icons.reply_rounded,
                                size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
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
                            style: TextStyle(
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
*/

/// Phase 458 (hatalar.txt #15) — Verification Center.
/// Airtasker-style horizontal carousel: ID + Telefon + Ödeme + Lisans rozetleri.
/// Verilen alanlar olmayanlar gri/varsayılan gösterilir (mevcut data nullable).
/// Phase 471 — Cinematic 3D presence signal (şimşek ⚡).
/// Online  : sarı/turuncu glow + pulse + 3D yatay döndürme (matrix rotateY)
/// Offline : silik gri statik şimşek (animasyon yok)
/// peerPresenceProvider WebSocket ile real-time güncellenir (Phase 78).
class _PresenceSignal extends ConsumerStatefulWidget {
  final String userId;
  final bool forceOnline; // self-view → her zaman online göster
  const _PresenceSignal({
    required this.userId,
    this.forceOnline = false,
  });

  @override
  ConsumerState<_PresenceSignal> createState() => _PresenceSignalState();
}

class _PresenceSignalState extends ConsumerState<_PresenceSignal>
    with TickerProviderStateMixin {
  late final AnimationController _pulse;
  late final AnimationController _rotate;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _rotate = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat();
    if (!widget.forceOnline) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ref.read(presenceProvider.notifier).ensure(widget.userId);
      });
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    _rotate.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(peerPresenceProvider(widget.userId));
    final online = widget.forceOnline || p?.isOnline == true;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Tooltip(
        message: online ? 'Çevrimiçi' : 'Çevrimdışı',
        child: SizedBox(
          width: 30,
          height: 30,
          child: online
              ? AnimatedBuilder(
                  animation: Listenable.merge([_pulse, _rotate]),
                  builder: (_, __) {
                    final t = _pulse.value; // 0..1..0
                    final rotY = (_rotate.value * 2 * 3.14159);
                    final glow = 6.0 + t * 10.0;
                    final scale = 0.92 + t * 0.18;
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 26 + t * 6,
                          height: 26 + t * 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                Colors.amber.withValues(alpha: 0.55 - t * 0.25),
                                Colors.amber.withValues(alpha: 0),
                              ],
                            ),
                          ),
                        ),
                        Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.0012)
                            ..rotateY(rotY)
                            ..scaleByDouble(scale, scale, scale, 1.0),
                          child: Icon(
                            Icons.bolt_rounded,
                            size: 22,
                            color: const Color(0xFFFFD54F),
                            shadows: [
                              Shadow(
                                color: const Color(0xFFFFC107)
                                    .withValues(alpha: 0.9),
                                blurRadius: glow,
                              ),
                              Shadow(
                                color: const Color(0xFFFF8F00)
                                    .withValues(alpha: 0.6),
                                blurRadius: glow * 1.4,
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                )
              : Icon(
                  Icons.bolt_rounded,
                  size: 20,
                  color: Colors.white.withValues(alpha: 0.35),
                ),
        ),
      ),
    );
  }
}

/// Phase 470 — Rozetler bölümü artık collapsible (chevron toggle).
/// Phase 473 — Default KAPALI (kullanıcı isteği). Tap ile aç.
/// Phase 477 — Public hale getirildi; ProfileScreen de aynı panel'i çağırıyor.
class PerformancePanel extends StatefulWidget {
  final int reviews;
  final double rating;
  final int successWorker;
  final int totalWorker;
  final List<String> categories;
  final String? bio;
  final List<Map<String, dynamic>> reviewList;
  final List badges;
  final List<Map<String, dynamic>> certifications;
  const PerformancePanel({super.key,
    required this.reviews,
    required this.rating,
    required this.successWorker,
    required this.totalWorker,
    required this.categories,
    required this.bio,
    required this.reviewList,
    required this.badges,
    required this.certifications,
  });

  @override
  State<PerformancePanel> createState() => _PerformancePanelState();
}

class _PerformancePanelState extends State<PerformancePanel>
    with SingleTickerProviderStateMixin {
  bool _open = true; // Phase 513 — default açık (initiallyExpanded=true)

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded,
                          size: 18, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text('Performans Paneli',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.2,
                              color: AppColors.textPrimary)),
                      const SizedBox(width: 4),
                      const InfoHint(k: 'perf.badges'),
                    ],
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    duration: const Duration(milliseconds: 180),
                    turns: _open ? 0.5 : 0.0,
                    child: Icon(Icons.keyboard_arrow_down_rounded,
                        color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _BadgesMiniStats(
                    reviews: widget.reviews,
                    rating: widget.rating,
                    successWorker: widget.successWorker,
                    totalWorker: widget.totalWorker,
                    categories: widget.categories,
                    bio: widget.bio,
                    reviewList: widget.reviewList,
                  ),
                  if (widget.badges.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _TappableBadgeRow(
                      badges: widget.badges,
                      certifications: widget.certifications,
                    ),
                  ],
                ],
              ),
            ),
            crossFadeState:
                _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 220),
            sizeCurve: Curves.easeInOut,
          ),
        ],
      ),
    );
  }
}

/// Phase 469+470+473 — Rozetler içi mini metrik şeridi (tap'lı pill).
/// Aldığı yorum · Başarı oranı (/10) · Verdiği hizmet (kategori sayısı).
class _BadgesMiniStats extends StatelessWidget {
  final int reviews;
  final double rating;
  final int successWorker;
  final int totalWorker;
  final List<String> categories;
  final String? bio;
  final List<Map<String, dynamic>> reviewList;
  const _BadgesMiniStats({
    required this.reviews,
    required this.rating,
    required this.successWorker,
    required this.totalWorker,
    required this.categories,
    required this.bio,
    required this.reviewList,
  });

  @override
  Widget build(BuildContext context) {
    final ratio10 = totalWorker > 0
        ? (successWorker / totalWorker * 10.0)
        : 0.0;
    final ratio10Str = totalWorker > 0
        ? ratio10.toStringAsFixed(1)
        : '—';
    final catCount = categories.length;
    return Row(
      children: [
        Expanded(
          child: _statPill(
            context,
            icon: Icons.rate_review_outlined,
            value: reviews > 0 ? '$reviews' : '—',
            label: 'Aldığı yorum',
            color: Colors.amber,
            onTap: () => _StatDetailSheet.show(
              context,
              kind: _StatKind.reviews,
              reviews: reviews,
              rating: rating,
              successWorker: successWorker,
              totalWorker: totalWorker,
              categories: categories,
              bio: bio,
              reviewList: reviewList,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _statPill(
            context,
            icon: Icons.trending_up_rounded,
            value: ratio10Str == '—' ? '—' : '$ratio10Str/10',
            label: 'Başarı oranı',
            color: AppColors.primary,
            onTap: () => _StatDetailSheet.show(
              context,
              kind: _StatKind.success,
              reviews: reviews,
              rating: rating,
              successWorker: successWorker,
              totalWorker: totalWorker,
              categories: categories,
              bio: bio,
              reviewList: reviewList,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _statPill(
            context,
            icon: Icons.handyman_outlined,
            // Phase 473 — Verdiği hizmet artık eklediği kategori sayısı.
            value: catCount > 0 ? '$catCount' : '—',
            label: 'Verdiği hizmet',
            color: AppColors.success,
            onTap: () => _StatDetailSheet.show(
              context,
              kind: _StatKind.services,
              reviews: reviews,
              rating: rating,
              successWorker: successWorker,
              totalWorker: totalWorker,
              categories: categories,
              bio: bio,
              reviewList: reviewList,
            ),
          ),
        ),
      ],
    );
  }

  Widget _statPill(
    BuildContext context, {
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: color.withValues(alpha: 0.18),
        highlightColor: color.withValues(alpha: 0.08),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 14, color: color),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      value,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(Icons.info_outline,
                      size: 11, color: color.withValues(alpha: 0.6)),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _StatKind { reviews, success, services }

/// Phase 470 — Mini stat pill tap → detay bottom sheet.
/// Her metrik için: büyük rakam + progress bar + benchmark + açıklama.
class _StatDetailSheet {
  static void show(
    BuildContext context, {
    required _StatKind kind,
    required int reviews,
    required double rating,
    required int successWorker,
    required int totalWorker,
    required List<String> categories,
    required String? bio,
    required List<Map<String, dynamic>> reviewList,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (_) => _StatDetailContent(
        kind: kind,
        reviews: reviews,
        rating: rating,
        successWorker: successWorker,
        totalWorker: totalWorker,
        categories: categories,
        bio: bio,
        reviewList: reviewList,
      ),
    );
  }
}

class _StatDetailContent extends StatelessWidget {
  final _StatKind kind;
  final int reviews;
  final double rating;
  final int successWorker;
  final int totalWorker;
  final List<String> categories;
  final String? bio;
  final List<Map<String, dynamic>> reviewList;
  const _StatDetailContent({
    required this.kind,
    required this.reviews,
    required this.rating,
    required this.successWorker,
    required this.totalWorker,
    required this.categories,
    required this.bio,
    required this.reviewList,
  });

  @override
  Widget build(BuildContext context) {
    switch (kind) {
      case _StatKind.reviews:
        return _reviewsBody(context);
      case _StatKind.success:
        return _successBody(context);
      case _StatKind.services:
        return _servicesBody(context);
    }
  }

  // ── Reviews — Phase 473: horizontal slider ─────────────────────────────
  Widget _reviewsBody(BuildContext context) {
    String bench;
    Color benchColor;
    if (rating >= 4.5) {
      bench = 'Mükemmel';
      benchColor = AppColors.success;
    } else if (rating >= 4.0) {
      bench = 'İyi';
      benchColor = AppColors.primary;
    } else if (rating >= 3.0) {
      bench = 'Orta';
      benchColor = Colors.orange;
    } else if (rating > 0) {
      bench = 'Geliştirmeli';
      benchColor = AppColors.error;
    } else {
      bench = 'Henüz yok';
      benchColor = AppColors.textSecondary;
    }
    return _shellSlider(
      icon: Icons.rate_review_outlined,
      accent: Colors.amber,
      title: 'Aldığı Yorumlar',
      headerValue: reviews > 0 ? '$reviews' : '—',
      headerSubtitle: rating > 0
          ? '⭐ ${rating.toStringAsFixed(1)}/5.0 · $reviews yorum'
          : 'Henüz değerlendirme yok',
      bench: bench,
      benchColor: benchColor,
      slider: reviewList.isEmpty
          ? _emptyState('Henüz yorum yok.', Icons.rate_review_outlined)
          : _ReviewsSlider(items: reviewList),
    );
  }

  // ── Success ratio ──────────────────────────────────────────────────────
  Widget _successBody(BuildContext context) {
    final has = totalWorker > 0;
    final ratio = has ? (successWorker / totalWorker) : 0.0;
    final ratio10 = ratio * 10.0;
    String bench;
    Color benchColor;
    if (!has) {
      bench = 'Henüz iş yok';
      benchColor = AppColors.textSecondary;
    } else if (ratio >= 0.9) {
      bench = 'Mükemmel';
      benchColor = AppColors.success;
    } else if (ratio >= 0.75) {
      bench = 'İyi';
      benchColor = AppColors.primary;
    } else if (ratio >= 0.5) {
      bench = 'Orta';
      benchColor = Colors.orange;
    } else {
      bench = 'Düşük';
      benchColor = AppColors.error;
    }
    return _shell(
      icon: Icons.trending_up_rounded,
      accent: AppColors.primary,
      title: 'Başarı Oranı',
      bigValue: has ? '${ratio10.toStringAsFixed(1)}/10' : '—',
      bigCaption: has ? '$successWorker / $totalWorker iş tamamlandı' : 'iş yok',
      progressLabel:
          has ? '%${(ratio * 100).round()} başarı' : null,
      progress: has ? ratio : null,
      progressColor: AppColors.primary,
      bench: bench,
      benchColor: benchColor,
      explanation:
          'Tamamladığı iş sayısının üstlendiği toplam işe oranıdır. '
          'Başarı = işin son durumunun "Tamamlandı" olarak kapatılması. '
          '7.5/10 ve üzeri sektör ortalamasının üstüdür.',
    );
  }

  // ── Services — Phase 473: kategori chip'leri + bio (sıkıştırılmış) ─────
  Widget _servicesBody(BuildContext context) {
    final count = categories.length;
    String bench;
    Color benchColor;
    if (count == 0) {
      bench = 'Henüz yok';
      benchColor = AppColors.textSecondary;
    } else if (count >= 5) {
      bench = 'Çok yönlü';
      benchColor = AppColors.success;
    } else if (count >= 3) {
      bench = 'Geniş';
      benchColor = AppColors.primary;
    } else {
      bench = 'Odaklı';
      benchColor = Colors.orange;
    }
    final hasBio = bio != null && bio!.trim().isNotEmpty;
    return _shellSlider(
      icon: Icons.handyman_outlined,
      accent: AppColors.success,
      title: 'Verdiği Hizmetler',
      headerValue: count > 0 ? '$count' : '—',
      headerSubtitle: count > 0
          ? '$count hizmet kategorisi'
          : 'Henüz kategori eklenmemiş',
      bench: bench,
      benchColor: benchColor,
      slider: count == 0 && !hasBio
          ? _emptyState('Henüz hizmet eklenmemiş.', Icons.handyman_outlined)
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (count > 0) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: categories
                        .map((c) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: AppColors.success
                                        .withValues(alpha: 0.35),
                                    width: 1),
                              ),
                              child: Text(c,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.success,
                                  )),
                            ))
                        .toList(),
                  ),
                ],
                if (hasBio) ...[
                  if (count > 0) const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border, width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Icon(Icons.info_outline,
                              size: 13, color: AppColors.textSecondary),
                          const SizedBox(width: 5),
                          Text('Açıklama',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecondary,
                                  letterSpacing: 0.2)),
                        ]),
                        const SizedBox(height: 6),
                        Text(bio!.trim(),
                            style: TextStyle(
                              fontSize: 12.5,
                              height: 1.45,
                              color: AppColors.textPrimary,
                            )),
                      ],
                    ),
                  ),
                ],
              ],
            ),
    );
  }

  Widget _emptyState(String message, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        children: [
          Icon(icon, size: 28, color: AppColors.textSecondary),
          const SizedBox(height: 8),
          Text(message,
              style: TextStyle(
                  fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  // ── Reusable shell ─────────────────────────────────────────────────────
  Widget _shell({
    required IconData icon,
    required Color accent,
    required String title,
    required String bigValue,
    required String bigCaption,
    String? progressLabel,
    double? progress,
    required Color progressColor,
    required String bench,
    required Color benchColor,
    required String explanation,
  }) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: accent, size: 20),
                ),
                const SizedBox(width: 10),
                Text(title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    )),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: benchColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: benchColor.withValues(alpha: 0.4), width: 1),
                  ),
                  child: Text(bench,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: benchColor,
                      )),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(bigValue,
                    style: TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary,
                      height: 1.0,
                    )),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(bigCaption,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      )),
                ),
              ],
            ),
            if (progress != null && progressLabel != null) ...[
              const SizedBox(height: 14),
              Text(progressLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  )),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: progressColor.withValues(alpha: 0.12),
                  valueColor: AlwaysStoppedAnimation(progressColor),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border, width: 1),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline,
                      size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(explanation,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.45,
                          color: AppColors.textSecondary,
                        )),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Phase 473 — Yeni shell: header (icon+title+bench) + sayı + alt başlık
  /// + slider body (kategoriler / yorum kartları). Açıklama bloğu yok —
  /// içerik kendi başına anlatıcı.
  Widget _shellSlider({
    required IconData icon,
    required Color accent,
    required String title,
    required String headerValue,
    required String headerSubtitle,
    required String bench,
    required Color benchColor,
    required Widget slider,
  }) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: accent, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            )),
                        const SizedBox(height: 2),
                        Text(headerSubtitle,
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: benchColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: benchColor.withValues(alpha: 0.4), width: 1),
                    ),
                    child: Text(bench,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: benchColor,
                        )),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              slider,
              const SizedBox(height: 4),
            ],
          ),
        ),
      ),
    );
  }
}

/// Phase 473 — Aldığı Yorumlar sheet'i için yatay swipe slider.
/// Her kart: yıldız satırı + reviewer adı + yorum metni + tarih.
/// PageView snap (clip) + alt dot indicator.
class _ReviewsSlider extends StatefulWidget {
  final List<Map<String, dynamic>> items;
  const _ReviewsSlider({required this.items});

  @override
  State<_ReviewsSlider> createState() => _ReviewsSliderState();
}

class _ReviewsSliderState extends State<_ReviewsSlider> {
  final PageController _ctrl = PageController(viewportFraction: 0.94);
  int _index = 0;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.items;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _ctrl,
            itemCount: items.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) {
              final r = items[i];
              final stars = (r['rating'] as num?)?.toInt() ?? 0;
              final comment = (r['comment'] as String?) ?? '';
              final reviewer = r['reviewer'] is Map
                  ? Map<String, dynamic>.from(r['reviewer'] as Map)
                  : <String, dynamic>{};
              final reviewerName =
                  (reviewer['fullName'] as String?) ?? 'Anonim';
              final created = r['createdAt'] as String?;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: List.generate(5, (s) {
                          final filled = s < stars;
                          return Padding(
                            padding: const EdgeInsets.only(right: 2),
                            child: Icon(
                              filled ? Icons.star_rounded
                                     : Icons.star_outline_rounded,
                              size: 16,
                              color: filled
                                  ? Colors.amber
                                  : AppColors.textSecondary
                                      .withValues(alpha: 0.4),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 8),
                      Text(reviewerName,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          )),
                      if (created != null) ...[
                        const SizedBox(height: 2),
                        Text(_formatDate(created),
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.textSecondary,
                            )),
                      ],
                      const SizedBox(height: 10),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Text(
                            comment.isNotEmpty
                                ? comment
                                : 'Yorum metni yok.',
                            style: TextStyle(
                              fontSize: 12.5,
                              height: 1.45,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(items.length, (i) {
            final active = i == _index;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active
                    ? Colors.amber
                    : AppColors.textSecondary.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(
          'Kaydırarak gez',
          style: TextStyle(
            fontSize: 10,
            color: AppColors.textSecondary.withValues(alpha: 0.7),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
                      'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return '${dt.day} ${months[dt.month]} ${dt.year}';
    } catch (_) {
      return '';
    }
  }
}

/// Phase 474 — Tap'lı rozet satırı. Default BadgeRow yerine kullanılır
/// (Performans Paneli içinde). Her rozet chip → bottom sheet detay.
class _TappableBadgeRow extends StatelessWidget {
  final List badges;
  final List<Map<String, dynamic>> certifications;
  const _TappableBadgeRow({
    required this.badges,
    required this.certifications,
  });

  @override
  Widget build(BuildContext context) {
    final parsed = <Map<String, String>>[];
    for (final raw in badges) {
      if (raw is! Map) continue;
      final label = (raw['label'] ?? '').toString();
      if (label.isEmpty) continue;
      final key = (raw['key'] ?? '').toString().toLowerCase();
      final labelLower = label.toLowerCase();
      if (key == 'verified' || labelLower == 'doğrulanmış') continue;
      parsed.add({
        'key': key,
        'label': label,
        'icon': (raw['icon'] ?? '').toString(),
      });
    }
    if (parsed.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: parsed.length,
        physics: const BouncingScrollPhysics(),
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final b = parsed[i];
          return InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => _BadgeDetailSheet.show(
              context,
              badgeKey: b['key']!,
              label: b['label']!,
              icon: b['icon']!,
              certifications: certifications,
            ),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (b['icon']!.isNotEmpty) ...[
                    Text(b['icon']!, style: const TextStyle(fontSize: 14)),
                    const SizedBox(width: 6),
                  ],
                  Text(b['label']!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      )),
                  const SizedBox(width: 4),
                  Icon(Icons.info_outline,
                      size: 11,
                      color: AppColors.primary.withValues(alpha: 0.6)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Phase 474 — Rozet detay bottom sheet (mini-stats sheet ile aynı mimari).
class _BadgeDetailSheet {
  static void show(
    BuildContext context, {
    required String badgeKey,
    required String label,
    required String icon,
    required List<Map<String, dynamic>> certifications,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (_) => _BadgeDetailContent(
        badgeKey: badgeKey,
        label: label,
        icon: icon,
        certifications: certifications,
      ),
    );
  }
}

class _BadgeDetailContent extends StatelessWidget {
  final String badgeKey;
  final String label;
  final String icon;
  final List<Map<String, dynamic>> certifications;
  const _BadgeDetailContent({
    required this.badgeKey,
    required this.label,
    required this.icon,
    required this.certifications,
  });

  _BadgeInfo _resolve() {
    switch (badgeKey) {
      case 'top_rated':
        return _BadgeInfo(
          accent: Colors.amber,
          headline: 'Üst Sıralama',
          description:
              'Ortalama puanı 4.5/5.0 ve üzeri olan, en az 10 yorum almış '
              'kullanıcılara verilir. Yüksek müşteri memnuniyeti ve '
              'tutarlı kalitenin kanıtıdır.',
          criteria: const [
            '⭐ Ortalama puan ≥ 4.5/5.0',
            '📝 En az 10 yorum',
          ],
        );
      case 'prolific':
        return _BadgeInfo(
          accent: AppColors.success,
          headline: 'Deneyimli',
          description:
              'Platformda 50 ve üzeri iş tamamlamış kullanıcılara verilir. '
              'Yıllarca süren uygulamalı deneyim ve geniş portföy demektir.',
          criteria: const ['🏆 50+ tamamlanmış iş'],
        );
      case 'rising_star':
        return _BadgeInfo(
          accent: AppColors.primary,
          headline: 'Yükselen Yıldız',
          description:
              'Henüz yolun başında ama hızlı ilerleyen, kaliteyi ilk işten '
              'itibaren koruyan kullanıcılara verilir. Yeni ama güvenilir.',
          criteria: const [
            '🌟 5-19 tamamlanmış iş',
            '⭐ Ortalama puan ≥ 4.0/5.0',
          ],
        );
      case 'available_now':
        return _BadgeInfo(
          accent: AppColors.success,
          headline: 'Şu An Müsait',
          description:
              'Hizmet veren profilinde "Aktif/Müsait" ayarını açık tutuyor. '
              'Hızlı yanıt ve hızlı teklif demektir.',
          criteria: const ['🟢 Aktiflik toggle açık'],
        );
      case 'complete_profile':
        return _BadgeInfo(
          accent: AppColors.primary,
          headline: 'Eksiksiz Profil',
          description:
              'Profil tamamlanma oranı %100. Fotoğraf, kategori, açıklama, '
              'iletişim ve doğrulama alanlarının tümü dolu. Güvenilirlik artar.',
          criteria: const ['💯 Profil tamamlanma oranı %100'],
        );
      case 'pro_member':
        return _BadgeInfo(
          accent: Colors.cyan,
          headline: 'Pro Üye',
          description:
              'Pro abonelik planı aktif. Premium görünürlük, öncelikli '
              'teklif eşleştirme ve gelişmiş analiz erişimi içerir.',
          criteria: const ['💎 Pro Üyelik aktif'],
        );
      case 'premium_member':
        return _BadgeInfo(
          accent: Colors.deepPurple,
          headline: 'Premium Üye',
          description:
              'Premium abonelik planı aktif. En üst görünürlük seviyesi, '
              'reklamsız deneyim, sınırsız teklif kontenjanı.',
          criteria: const ['👑 Premium Üyelik aktif'],
        );
      default:
        return _BadgeInfo(
          accent: AppColors.primary,
          headline: label,
          description:
              'Bu rozet, kullanıcının platform üzerindeki başarı ve '
              'aktivitesini gösterir.',
          criteria: const [],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final info = _resolve();
    final isCert = label.toLowerCase().contains('sertifika');
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: info.accent.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      icon.isNotEmpty ? icon : '🏅',
                      style: const TextStyle(fontSize: 22),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(info.headline,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            )),
                        const SizedBox(height: 2),
                        Text('Kazanılmış rozet',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            )),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: info.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: info.accent.withValues(alpha: 0.4),
                          width: 1),
                    ),
                    child: Text('Aktif',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: info.accent,
                        )),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border, width: 1),
                ),
                child: Text(info.description,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.5,
                      color: AppColors.textPrimary,
                    )),
              ),
              if (info.criteria.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text('Kazanma kriteri',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.3,
                    )),
                const SizedBox(height: 6),
                ...info.criteria.map((c) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.check_circle_rounded,
                              size: 14, color: info.accent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(c,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textPrimary,
                                )),
                          ),
                        ],
                      ),
                    )),
              ],
              if (isCert && certifications.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('Sertifikalar (${certifications.length})',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.3,
                    )),
                const SizedBox(height: 8),
                ...certifications.map((c) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Text('🪪', style: TextStyle(fontSize: 18)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text((c['name'] ?? '') as String,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    )),
                                const SizedBox(height: 2),
                                Text((c['issuer'] ?? '') as String,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary,
                                    )),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
              const SizedBox(height: 6),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeInfo {
  final Color accent;
  final String headline;
  final String description;
  final List<String> criteria;
  _BadgeInfo({
    required this.accent,
    required this.headline,
    required this.description,
    required this.criteria,
  });
}

/// Phase 506 — "Hizmet Aldıkları" collapsible card.
/// Bu kullanıcı müşteri rolünde tamamladığı hizmetlerin özet listesini gösterir.
/// Tap → `/ilan/:id` (JobDetailScreen). Performance Panel paterniyle uyumlu.
class _CustomerPastJobsCard extends StatefulWidget {
  final List<Map<String, dynamic>> jobs;
  const _CustomerPastJobsCard({required this.jobs});

  @override
  State<_CustomerPastJobsCard> createState() => _CustomerPastJobsCardState();
}

class _CustomerPastJobsCardState extends State<_CustomerPastJobsCard> {
  bool _open = false; // Phase 506 — default kapalı (Performans Paneli paterni)

  @override
  Widget build(BuildContext context) {
    final count = widget.jobs.length;
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(Icons.work_history_outlined,
                      size: 18, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text('Hizmet Aldıkları',
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                          color: AppColors.textPrimary)),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text('$count',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary)),
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    duration: const Duration(milliseconds: 180),
                    turns: _open ? 0.5 : 0.0,
                    child: Icon(Icons.keyboard_arrow_down_rounded,
                        color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (int i = 0; i < widget.jobs.length; i++) ...[
                    _CustomerPastJobTile(job: widget.jobs[i]),
                    if (i < widget.jobs.length - 1)
                      Divider(
                        height: 16,
                        thickness: 0.5,
                        color: AppColors.border,
                      ),
                  ],
                ],
              ),
            ),
            crossFadeState:
                _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 220),
            sizeCurve: Curves.easeInOut,
          ),
        ],
      ),
    );
  }
}

/// Phase 506 — Tek bir geçmiş ilan satırı (Airtasker pattern).
/// Thumbnail (varsa) + başlık + kategori chip + relative tarih + chevron.
class _CustomerPastJobTile extends StatelessWidget {
  final Map<String, dynamic> job;
  const _CustomerPastJobTile({required this.job});

  @override
  Widget build(BuildContext context) {
    final id = job['id'] as String?;
    final title = (job['title'] as String?)?.trim() ?? 'İlan';
    final category = (job['category'] as String?)?.trim() ?? '';
    final completedAt = job['completedAt'] as String?;
    final photoUrl = job['photoUrl'] as String?;

    return InkWell(
      onTap: id == null ? null : () => context.push('/ilan/$id'),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Thumbnail veya placeholder
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 52,
                height: 52,
                child: photoUrl != null && photoUrl.isNotEmpty
                    ? Image.network(
                        photoUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            _placeholderThumb(context),
                      )
                    : _placeholderThumb(context),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (category.isNotEmpty) ...[
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color:
                                      AppColors.success.withValues(alpha: 0.25),
                                  width: 0.5),
                            ),
                            child: Text(
                              category,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.success,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      if (completedAt != null)
                        Text(
                          _relativeTime(completedAt),
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.chevron_right_rounded,
                color: AppColors.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _placeholderThumb(BuildContext context) {
    return Container(
      color: AppColors.primary.withValues(alpha: 0.08),
      child: Icon(
        Icons.work_outline_rounded,
        color: AppColors.primary.withValues(alpha: 0.6),
        size: 22,
      ),
    );
  }

  static String _relativeTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inDays >= 365) {
        final y = (diff.inDays / 365).floor();
        return '$y yıl önce';
      }
      if (diff.inDays >= 30) {
        final m = (diff.inDays / 30).floor();
        return '$m ay önce';
      }
      if (diff.inDays >= 7) {
        final w = (diff.inDays / 7).floor();
        return '$w hafta önce';
      }
      if (diff.inDays > 0) return '${diff.inDays} gün önce';
      if (diff.inHours > 0) return '${diff.inHours} saat önce';
      return 'Az önce';
    } catch (_) {
      return '';
    }
  }
}
