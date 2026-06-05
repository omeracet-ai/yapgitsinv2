import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/app_config/app_config_provider.dart';
import '../../../../core/app_config/app_config_visibility.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../../core/widgets/rating_progress_bar.dart';
import '../../../../core/widgets/stat_info_popup.dart';
import '../../../profile/data/user_profile_repository.dart';
import '../../../users/widgets/user_action_menu.dart';
import '../../../tokens/widgets/gift_tokens_sheet.dart';
import '../providers/auth_provider.dart';
import '../../../reviews/widgets/review_reply_sheet.dart';
import '../../widgets/portfolio_gallery.dart';
import '../../widgets/intro_video_section.dart';
// Phase 419 — portfolio_grid + verified_category_badges import'ları kaldırıldı.
import '../../widgets/availability_editor_sheet.dart';
import '../../widgets/review_summary_card.dart';
import '../../../users/widgets/badge_row.dart';
import '../../../users/widgets/worker_documents_card.dart';
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
  const PublicProfileScreen({super.key, required this.userId});

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
    // Phase 322 — reputation chip kaldırıldı (3-metrik analizine geçildi).
    // ignore: unused_local_variable
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
    final showRating      = isProfileFieldVisible('averageRating',   appCfg);
    final showReviews     = isProfileFieldVisible('reviewsCount',    appCfg);
    final showJobs        = isProfileFieldVisible('jobsCount',       appCfg);
    final showCompletion  = isProfileFieldVisible('completionRate',  appCfg);
    final showReputation  = isProfileFieldVisible('reputationScore', appCfg);
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
      bottomNavigationBar: (isWorker && !isSelf)
          ? SafeArea(
              top: false,
              minimum: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Phase 431 — Phase 330'daki "Hizmet al" üst başlığı kaldırıldı
                  // (kullanıcı isteği): buton zaten "Hizmet Al" yazıyor, redundant.
                  Material(
                    color: AppColors.surface,
                    elevation: 8,
                    shadowColor: Colors.black.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
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
                    label: const Text('Hizmet Al',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      if (currentUserId == null) {
                        context.push('/giris-yap', extra: {
                          'returnTo': '/usta/$userId',
                        });
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
                ],
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
              if (!isSelf) ...[
                IconButton(
                  tooltip: 'Kredi hediye et',
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
                      // Phase 327 — Son görülme zamanı. Online ise canlı yeşil,
                      // değilse son görüldüğü zaman (gün granularitesinde).
                      Builder(builder: (_) {
                        final online = data['isOnline'] == true;
                        final lsStr = data['lastSeenAt'] as String?;
                        if (online) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 7, height: 7,
                                  decoration: const BoxDecoration(
                                    color: AppColors.verifiedGreen,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                const Text('Çevrimiçi',
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.verifiedGreen)),
                              ],
                            ),
                          );
                        }
                        if (lsStr == null) return const SizedBox.shrink();
                        final ls = DateTime.tryParse(lsStr);
                        if (ls == null) return const SizedBox.shrink();
                        final diff = DateTime.now().difference(ls);
                        String text;
                        if (diff.inMinutes < 5) {
                          text = 'Az önce çevrimiçi';
                        } else if (diff.inHours < 1) {
                          text = '${diff.inMinutes} dk önce';
                        } else if (diff.inHours < 24) {
                          text = '${diff.inHours} saat önce';
                        } else {
                          text = '${diff.inDays} gün önce';
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text('Son görülme: $text',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.verifiedGreen)),
                        );
                      }),
                    ],        // Column children
                    ),        // Column
                  ),          // SafeArea
                ],            // Stack children
              ),              // Stack (background)
            ),                // FlexibleSpaceBar
          ),                  // SliverAppBar

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Phase 433 — İnce rating progress bar (metin yok, sadece
                // renk + dolgu). Header'ın hemen altında full-width.
                Container(
                  color: AppColors.surface,
                  padding:
                      const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: RatingProgressBar(rating: rating),
                ),
                // ── İstatistikler ────────────────────────────────────────
                // Admin /profile-card ekranı her bir kartı tek tek
                // gizleyebilir. Tüm kartlar gizliyse Container'ı hiç çizme.
                // Phase 322 — 3 metrik analizi (worker/customer'a göre):
                //   Tamamlanan İş (X/Y)  ·  Başarı Oranı (k.k/5.0)  ·
                //   Değerlendirme (avgRating/5.0)
                // Tüm kartlar 5.0 ölçeğinde okunur → kullanıcı tek bakışta
                // karşılaştırır. Reputation/jobs/old rating kartları kaldırıldı.
                Builder(builder: (_) {
                  final total = isWorker ? totalWorker : totalCustomer;
                  final success =
                      isWorker ? successWorker : successCustomer;
                  // Başarı oranı 5.0 ölçeğine yansıtıldı: success/total * 5.
                  final ratio5 =
                      total > 0 ? (success / total * 5.0) : 0.0;
                  final stats = <Widget>[
                    _bigStat(
                      label: total > 0 ? '$success/$total' : '—',
                      sub: 'Tamamlanan İş',
                      icon: Icons.check_circle_outline_rounded,
                      iconColor: AppColors.success,
                      tooltip: isWorker
                          ? StatTooltips.completedWorker
                          : StatTooltips.completedCustomer,
                    ),
                    _divider(),
                    _bigStat(
                      label: total > 0
                          ? '${ratio5.toStringAsFixed(1)}/5.0'
                          : '—',
                      sub: 'Başarı Oranı',
                      icon: Icons.trending_up_rounded,
                      iconColor: AppColors.primary,
                      tooltip: StatTooltips.successScore5,
                    ),
                    _divider(),
                    _bigStat(
                      label: rating > 0
                          ? '${rating.toStringAsFixed(1)}/5.0'
                          : '—',
                      sub:
                          showReviews ? '$reviews yorum' : 'Değerlendirme',
                      icon: Icons.star_rounded,
                      iconColor: Colors.amber,
                      tooltip: showReviews
                          ? StatTooltips.reviews
                          : StatTooltips.rating,
                    ),
                  ];
                  // Tüm tilesları admin tarafı tek tek gizleyebilir; en az
                  // bir kart aktifse render et.
                  if (!showRating && !showReputation && !showJobs &&
                      !showCompletion) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    color: AppColors.surface,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Row(children: stats),
                  );
                }),

                // Eski "Teklif Yap" CTA Phase 265e'de tek "Bu Ustaya Teklif
                // Ver" butonuyla birleştirildi (aşağıda).
                const SizedBox(height: 8),

                // ── Rozetler ─────────────────────────────────────────────
                // Phase 422 — Filter sonrası boş kalan rozet listesinde
                // section başlığı bile gizli. BadgeRow Phase 418'de
                // "Doğrulanmış" eliyor; sadece o rozet varsa bölüm boş
                // kalıyordu.
                if (showBadges &&
                    _hasVisibleBadges(badges)) ...[
                  _section(
                    title: 'Rozetler',
                    child: BadgeRow(badges: badges),
                  ),
                  const SizedBox(height: 8),
                ],

                // Phase 329 — "Hakkında" ayrı section yerine kartın
                // sonuna sıkıştırıldı; başlık → "Kullanıcı Açıklaması"
                // (kullanıcı "title hatalı" demişti — daha anlaşılır).
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

                // Phase 419 — "Belge ile Doğrulanmış N Kategori" bölümü
                // kaldırıldı (kullanıcı isteği): WorkerDocumentsCard zaten
                // belge görseli + kategorileri listeliyor, tekrar görsel
                // gürültü yaratıyordu.

                // ── Ustalık belgeleri (varsa "Usta" title + belge kartı) ──
                WorkerDocumentsCard(
                  documents: ((data['workerDocuments'] as List?) ?? const [])
                      .whereType<Map>()
                      .map((m) => Map<String, dynamic>.from(m))
                      .toList(),
                  isSelf: isSelf,
                ),

                // Phase 422 — Chip-list 'Hizmet Kategorileri' kaldırıldı
                // (kullanıcı isteği). Dropdown tabanlı tek liste kaldı
                // ("Bu Ustaya Teklif Ver" CTA → PostJob form'unda).

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

                // ── AI Yorum Özeti ───────────────────────────────────────
                if (reviews >= 3) ...[
                  ReviewSummaryCard(
                    userId: userId,
                    reviewComments: reviewList
                        .map((r) => (r['comment'] as String?)?.trim() ?? '')
                        .where((c) => c.isNotEmpty)
                        .toList(),
                  ),
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

                // ── Phase 159: Sertifikalar (verified only) ──────────────
                if ((data['certifications'] as List?)?.isNotEmpty == true) ...[
                  const SizedBox(height: 16),
                  const Text('📜 Sertifikalar',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...(((data['certifications'] as List?) ?? const [])
                      .whereType<Map>()
                      .map((m) => Map<String, dynamic>.from(m))
                      .map((c) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: AppColors.success
                                      .withValues(alpha: 0.3)),
                            ),
                            child: Row(children: [
                              const Text('🪪',
                                  style: TextStyle(fontSize: 22)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text((c['name'] ?? '') as String,
                                        style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 2),
                                    Text((c['issuer'] ?? '') as String,
                                        style: TextStyle(
                                            fontSize: 12,
                                            color:
                                                AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.success
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text('🪪 Doğrulandı',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w600)),
                              ),
                            ]),
                          ))),
                ],

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

  Widget _bigStat({
    required String label,
    required String sub,
    required IconData icon,
    required Color iconColor,
    String? tooltip,
  }) {
    // Phase 414 — sublabel yanına bilgi imleci (tooltip varsa).
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 22),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(sub,
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis),
              ),
              if (tooltip != null) ...[
                const SizedBox(width: 3),
                StatInfoIcon(
                  title: sub,
                  message: tooltip,
                  size: 12,
                  padding: EdgeInsets.zero,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _divider() => Container(width: 1, height: 40, color: Colors.grey.shade200);

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

  Widget _statRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
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
