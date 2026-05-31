import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/turkish_text.dart';
import '../../../../core/widgets/notification_bell.dart';
import '../../../wallet/presentation/screens/wallet_screen.dart';
import '../../../tokens/data/token_repository.dart';
// Gizlendi (Para Birimi menüsü kapalı): currency_picker_sheet importu.
// import '../../../currencies/presentation/currency_picker_sheet.dart';
import '../../../subscriptions/data/subscription_repository.dart';
import '../../../promo/widgets/promo_redeem_sheet.dart';
import '../providers/auth_provider.dart';
import '../../data/firebase_auth_repository.dart';
import 'personal_info_screen.dart';
import 'edit_profile_screen.dart';
import 'addresses_screen.dart';
import 'help_screen.dart';
import '../../../../core/network/api_client_provider.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../../../calendar/presentation/calendar_screen.dart';
import '../../../calendar/presentation/earnings_screen.dart';
import '../../../profile/widgets/profile_completion_card.dart';
// import '../../../profile/presentation/widgets/profile_video_uploader.dart'; // video upload UI hidden
import '../../widgets/availability_editor_sheet.dart';
import '../../../users/widgets/badge_row.dart';
import '../../../users/widgets/worker_documents_card.dart';
import '../../../users/widgets/verified_category_badges.dart';
import '../../../../core/theme/theme_mode_provider.dart';
import '../../../../core/services/locale_provider.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../certifications/data/certification_repository.dart';
// TODO(P190): migrate remaining strings to AppLocalizations

// ── Provider: kendi profil verisini çeker (stats + yorumlar + fotoğraflar) ──
// Phase 241 — Ham `Dio` kaldırıldı; AuthInterceptor'lı [ApiClient] kullanılır.
final myPublicProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return {};
  final userId = auth.user['id'] as String;
  final dio = ref.read(apiClientProvider).dio;
  final resp = await dio.get('/users/$userId/profile');
  return Map<String, dynamic>.from(resp.data as Map);
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    if (authState is! AuthAuthenticated) {
      return _buildGuestView(context);
    }

    final user = authState.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(AppLocalizations.of(context).tabProfil),
        backgroundColor: AppColors.headerBackground(context),
        elevation: 0,
        actions: const [
          NotificationBell(),
          SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myPublicProfileProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              const ProfileCompletionCard(),
              _buildProfileHeader(user),
              Consumer(builder: (context, ref, _) {
                final p = ref.watch(myPublicProfileProvider);
                return p.maybeWhen(
                  data: (d) {
                    final cats = ((d['verifiedCategories'] as List?) ?? const [])
                        .whereType<Map>()
                        .map((m) => Map<String, dynamic>.from(m))
                        .toList();
                    final docs = ((d['workerDocuments'] as List?) ?? const [])
                        .whereType<Map>()
                        .map((m) => Map<String, dynamic>.from(m))
                        .toList();
                    return Column(
                      children: [
                        // Phase 293 — Belge ile doğrulanmış kategoriler rozeti
                        VerifiedCategoryBadgesRow(categories: cats),
                        WorkerDocumentsCard(documents: docs, isSelf: true),
                      ],
                    );
                  },
                  orElse: () => const SizedBox.shrink(),
                );
              }),
              // Video upload UI hidden — restore by uncommenting below.
              // ProfileVideoUploader(
              //   onUploadSuccess: () => ref.invalidate(myPublicProfileProvider),
              // ),
              _buildTokenBanner(context, ref),
              // Phase 320 — Premium üyelik banner'ı + Email doğrulama kartı
              // gizlendi (kullanıcı isteği). İlgili widget tanımları kalır
              // ki gelecekte tekrar açılabilsin; build'den çekildiler.
              _buildIdentityStatus(user),
              _buildStatsSection(ref),
              _buildBadgesSection(ref),
              _buildCertificationsSection(ref),
              _buildPastPhotos(ref),
              _buildReviewsSection(ref),
              _buildMenuSection(context, ref),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGuestView(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: Text(AppLocalizations.of(context).tabProfil),
          backgroundColor: AppColors.headerBackground(context)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset('assets/icons/app_icon.png',
                    width: 80, height: 80, fit: BoxFit.cover),
              ),
              const SizedBox(height: 24),
              Text('Profilinizi görüntülemek için giriş yapın.',
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(fontSize: 16, color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/giris-yap'),
                  child: Text(AppLocalizations.of(context).loginButton),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader(Map<String, dynamic> user) {
    final name = user['fullName'] ?? 'Kullanıcı';
    final city = user['city'] as String?;
    final initials = trUpper(name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join());

    return Consumer(
      builder: (context, ref, _) {
        final profileAsync = ref.watch(myPublicProfileProvider);
        final avgRating = profileAsync.maybeWhen(
          data: (p) => (p['averageRating'] as num?)?.toDouble() ?? 0.0,
          orElse: () => 0.0,
        );
        final repScore = profileAsync.maybeWhen(
          data: (p) => (p['reputationScore'] as num?)?.toInt() ?? 0,
          orElse: () => 0,
        );
        final totalReviews = profileAsync.maybeWhen(
          data: (p) => (p['totalReviews'] as num?)?.toInt() ?? 0,
          orElse: () => 0,
        );

        return Container(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
          decoration: const BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: Colors.white24,
                        child: Text(initials,
                            style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                      ),
                      if (avgRating >= 4.5)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: const BoxDecoration(
                                color: Colors.amber, shape: BoxShape.circle),
                            child: const Icon(Icons.star,
                                size: 14, color: Colors.white),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                        if (city != null && city.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(children: [
                            const Icon(Icons.location_on_outlined,
                                size: 13, color: Colors.white70),
                            const SizedBox(width: 4),
                            Text(city,
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 13)),
                          ]),
                        ],
                        const SizedBox(height: 6),
                        if (avgRating > 0)
                          Row(children: [
                            ...List.generate(
                                5,
                                (i) => Icon(
                                      i < avgRating.floor()
                                          ? Icons.star
                                          : (i < avgRating
                                              ? Icons.star_half
                                              : Icons.star_border),
                                      size: 14,
                                      color: Colors.amber.shade300,
                                    )),
                            const SizedBox(width: 4),
                            Text(
                                '${avgRating.toStringAsFixed(1)} ($totalReviews yorum)',
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 12)),
                          ])
                        else
                          const Text('Henüz değerlendirme yok',
                              style: TextStyle(
                                  color: Colors.white54, fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: Colors.white),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const EditProfileScreen()),
                    ).then((_) =>
                        ref.invalidate(profileCompletionProvider)),
                  ),
                ],
              ),
              if (repScore > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(color: AppColors.surface.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _headerStat('🏆', '$repScore', 'İtibar Puanı'),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _headerStat(
                          '⭐', avgRating.toStringAsFixed(1), 'Ortalama Puan'),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _headerStat('📝', '$totalReviews', 'Değerlendirme'),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _headerStat(String emoji, String value, String label) {
    return Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 16)),
      const SizedBox(height: 2),
      Text(value,
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
    ]);
  }

  Widget _buildIdentityStatus(Map<String, dynamic> user) {
    final hasIdentity = user['identityPhotoUrl'] != null;
    final isVerified = user['identityVerified'] == true;

    final Color bgColor;
    final Color borderColor;
    final IconData icon;
    final String title;
    final String subtitle;

    if (isVerified) {
      bgColor = AppColors.verifiedGreen.withValues(alpha: 0.12);
      borderColor = AppColors.verifiedGreen;
      icon = Icons.verified_user;
      title = 'Kimlik Doğrulandı';
      subtitle = 'Hesabınız onaylıdır.';
    } else if (hasIdentity) {
      bgColor = AppColors.warning.withValues(alpha: 0.12);
      borderColor = AppColors.warning;
      icon = Icons.hourglass_empty;
      title = 'Kimlik İnceleniyor';
      subtitle = 'Doğrulama süreci devam ediyor.';
    } else {
      bgColor = AppColors.error.withValues(alpha: 0.12);
      borderColor = AppColors.error;
      icon = Icons.warning_amber_outlined;
      title = 'Kimlik Yüklenmedi';
      subtitle = 'Güven için kimlik fotoğrafı yükleyin.';
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor)),
      child: Row(children: [
        Icon(icon, color: borderColor, size: 24),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style:
                  TextStyle(fontWeight: FontWeight.bold, color: borderColor)),
          Text(subtitle,
              style: TextStyle(
                  fontSize: 12, color: borderColor.withValues(alpha: 0.8))),
        ]),
      ]),
    );
  }

  // Phase 320 — Build'den çekildi; gelecekte yeniden açılabilmesi için
  // tanım korunuyor.
  // ignore: unused_element
  Widget _buildEmailVerification(
      BuildContext context, WidgetRef ref, Map<String, dynamic> user) {
    final email = user['email'] as String?;
    if (email == null || email.isEmpty) return const SizedBox.shrink();
    final verified = user['emailVerified'] == true;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.email_outlined, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(email,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                if (verified)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.verifiedGreen.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.check_circle,
                          color: AppColors.verifiedGreen, size: 14),
                      SizedBox(width: 4),
                      Text('Doğrulanmış',
                          style: TextStyle(
                              color: AppColors.verifiedGreen,
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ]),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Doğrulanmadı',
                        style: TextStyle(
                            color: AppColors.warning,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),
          if (!verified)
            TextButton(
              onPressed: () => _requestEmailVerification(context, ref),
              child: const Text('Doğrula'),
            ),
        ],
      ),
    );
  }

  Future<void> _requestEmailVerification(
      BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res = await ref.read(firebaseAuthRepositoryProvider).requestEmailVerification();
      final url = res['verifyUrl'] as String?;
      if (!context.mounted) return;
      if (url == null || url.isEmpty) {
        messenger.showSnackBar(const SnackBar(
            content: Text('Doğrulama bağlantısı email ile gönderildi')));
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Email Doğrulama'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  'SMTP henüz aktif değil — bağlantıyı manuel açın',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 12),
              const Text('Doğrulama bağlantısı:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SelectableText(url, style: const TextStyle(fontSize: 12)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                      content: Text('Bağlantı kopyalandı')));
                }
              },
              child: const Text('Kopyala'),
            ),
            TextButton(
              onPressed: () async {
                final uri = Uri.tryParse(url);
                if (uri != null) {
                  await launchUrl(uri,
                      mode: LaunchMode.externalApplication);
                }
              },
              child: const Text('Tarayıcıda Aç'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Kapat'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Widget _buildTokenBanner(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    return GestureDetector(
      onTap: () => context.push('/jetonlar'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          const Icon(Icons.toll_rounded, color: Colors.white, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Sanal Kredi Bakiyesi',
                  style: TextStyle(color: Colors.white70, fontSize: 12)),
              balanceAsync.when(
                data: (b) => Text('$b Kredi',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
                loading: () => const Text('...',
                    style: TextStyle(color: Colors.white, fontSize: 18)),
                error: (_, __) => const Text('--',
                    style: TextStyle(color: Colors.white, fontSize: 18)),
              ),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
                color: Colors.white24, borderRadius: BorderRadius.circular(20)),
            child: const Text('Yükle',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13)),
          ),
        ]),
      ),
    );
  }

  // Phase 320 — Premium üyelik banner'ı build'den çekildi (kullanıcı isteği).
  // ignore: unused_element
  Widget _buildSubscriptionBanner(
      BuildContext context, WidgetRef ref, Map<String, dynamic> user) {
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) return const SizedBox.shrink();
    final myAsync = ref.watch(mySubscriptionProvider);
    return GestureDetector(
      onTap: () => context.push('/abonelik'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [AppColors.accent, AppColors.warning],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(children: [
          const Icon(Icons.workspace_premium, color: Colors.white, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: myAsync.when(
              data: (sub) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sub != null && sub.isActive
                          ? '✓ ${sub.plan.name}'
                          : 'Premium Üyelik',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                    Text(
                      sub != null && sub.isActive
                          ? 'Sınırsız teklif aktif'
                          : 'Sınırsız teklif & Pro özellikler',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12),
                    ),
                  ]),
              loading: () => const Text('...',
                  style: TextStyle(color: Colors.white)),
              error: (_, __) => const Text('Premium Üyelik',
                  style: TextStyle(color: Colors.white)),
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white),
        ]),
      ),
    );
  }

  // ── İstatistikler ──────────────────────────────────────────────────────────
  Widget _buildStatsSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('İstatistikler',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          profileAsync.when(
            loading: () => const Center(
                child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(strokeWidth: 2))),
            error: (_, __) => const SizedBox.shrink(),
            data: (profile) {
              if (profile.isEmpty) return const SizedBox.shrink();
              final cTotal = (profile['asCustomerTotal'] ?? 0) as int;
              final cSuccess = (profile['asCustomerSuccess'] ?? 0) as int;
              final cFail = (profile['asCustomerFail'] ?? 0) as int;
              final wTotal = (profile['asWorkerTotal'] ?? 0) as int;
              final wSuccess = (profile['asWorkerSuccess'] ?? 0) as int;
              final wFail = (profile['asWorkerFail'] ?? 0) as int;

              return Row(
                children: [
                  Expanded(
                    child: _statCard(
                      icon: Icons.shopping_bag_outlined,
                      color: AppColors.verifiedBlue,
                      title: 'Hizmet Alan',
                      total: cTotal,
                      success: cSuccess,
                      fail: cFail,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      icon: Icons.handyman_outlined,
                      color: AppColors.verifiedGreen,
                      title: 'Hizmet Veren',
                      total: wTotal,
                      success: wSuccess,
                      fail: wFail,
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _statCard({
    required IconData icon,
    required Color color,
    required String title,
    required int total,
    required int success,
    required int fail,
  }) {
    final rate = total > 0 ? (success / total * 100).round() : 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(title,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ]),
          const SizedBox(height: 12),
          Text('$rate%',
              style: TextStyle(
                  fontSize: 28, fontWeight: FontWeight.bold, color: color)),
          Text('başarı oranı',
              style: TextStyle(fontSize: 11, color: AppColors.textHint)),
          const SizedBox(height: 10),
          _statRow('Toplam', total, AppColors.textSecondary),
          const SizedBox(height: 2),
          _statRow('Başarılı', success, AppColors.verifiedGreen),
          const SizedBox(height: 2),
          _statRow('Başarısız', fail, AppColors.error),
          if (total > 0) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? success / total : 0,
                backgroundColor: AppColors.error.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _statRow(String label, int value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        Text('$value',
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  // ── Rozetlerim ────────────────────────────────────────────────────────────
  Widget _buildBadgesSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);
    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        final badges = data['badges'] as List?;
        if (badges == null || badges.isEmpty) return const SizedBox.shrink();
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Rozetlerim',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              BadgeRow(badges: badges),
            ],
          ),
        );
      },
    );
  }

  // ── Phase 159: Kendi sertifikaları (verified + pending) ──────────────────
  Widget _buildCertificationsSection(WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) return const SizedBox.shrink();

    final repo = ref.watch(certificationRepositoryProvider);
    return FutureBuilder<List<WorkerCertification>>(
      future: repo.listMine(),
      builder: (context, snapshot) {
        final certs = snapshot.data ?? const [];
        final verified = certs.where((c) => c.verified).toList();
        if (verified.isEmpty) return const SizedBox.shrink();
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Sertifikalarım',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              ...verified.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Text('🪪', style: TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600, fontSize: 14)),
                              Text(c.issuer,
                                  style: TextStyle(
                                      fontSize: 12, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.verifiedGreen.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text('Onaylı',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.verifiedGreen,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  // ── Geçmiş İş Fotoğrafları (4 adet) ───────────────────────────────────────
  Widget _buildPastPhotos(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (profile) {
        final photos = List<String>.from(profile['pastPhotos'] ?? []);
        if (photos.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Geçmiş İşlerden',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('${photos.length} fotoğraf',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textHint)),
                ],
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: photos.length.clamp(0, 4),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.1,
                ),
                itemBuilder: (ctx, i) => _photoTile(photos[i]),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _photoTile(String url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          color: AppColors.surfaceElevated,
          child: Icon(Icons.image_not_supported_outlined,
              color: AppColors.textHint),
        ),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return Container(
            color: AppColors.surface,
            child:
                const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        },
      ),
    );
  }

  // ── Değerlendirmeler ───────────────────────────────────────────────────────
  Widget _buildReviewsSection(WidgetRef ref) {
    final profileAsync = ref.watch(myPublicProfileProvider);

    return profileAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (profile) {
        final reviews =
            List<Map<String, dynamic>>.from(profile['reviews'] ?? []);
        final avg = (profile['averageRating'] ?? 0.0) as num;
        final total = (profile['totalReviews'] ?? 0) as int;

        if (reviews.isEmpty) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Text('Değerlendirmeler',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Icon(Icons.star, size: 16, color: Colors.amber.shade600),
                const SizedBox(width: 2),
                Text('${avg.toStringAsFixed(1)} ($total)',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
              ]),
              const SizedBox(height: 12),
              ...reviews.take(5).map((r) => _reviewCard(r)),
            ],
          ),
        );
      },
    );
  }

  Widget _reviewCard(Map<String, dynamic> r) {
    // Phase 265d — reviewer field bazen string gelebilir; defensive cast.
    final reviewerRaw = r['reviewer'];
    final reviewer = reviewerRaw is Map
        ? Map<String, dynamic>.from(reviewerRaw)
        : <String, dynamic>{};
    final name = reviewer['fullName'] ?? 'Kullanıcı';
    final rating = (r['rating'] ?? 0) as int;
    final comment = r['comment'] as String? ?? '';
    final createdAt = r['createdAt'] as String? ?? '';

    String timeAgo = '';
    if (createdAt.isNotEmpty) {
      final d = DateTime.tryParse(createdAt);
      if (d != null) {
        final diff = DateTime.now().difference(d).inDays;
        timeAgo = diff == 0
            ? 'Bugün'
            : diff == 1
                ? 'Dün'
                : '$diff gün önce';
      }
    }

    final initials = trUpper(name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join());

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              child: Text(initials,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    if (timeAgo.isNotEmpty)
                      Text(timeAgo,
                          style: TextStyle(
                              fontSize: 11, color: AppColors.textHint)),
                  ]),
            ),
            Row(
              children: List.generate(
                5,
                (i) => Icon(
                  i < rating ? Icons.star : Icons.star_border,
                  size: 14,
                  color: Colors.amber.shade600,
                ),
              ),
            ),
          ]),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(comment,
                style: TextStyle(
                    fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          _menuItem(Icons.person_outline, 'Kişisel Bilgiler', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
          }),
          _menuItem(Icons.account_balance_wallet_outlined,
              AppLocalizations.of(context).myWallet, () {
            Navigator.push(context,
                MaterialPageRoute(
                  builder: (_) => const WalletScreen(),
                ));
          }),
          _menuItem(Icons.calendar_month_outlined, 'İş Takvimi', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const CalendarScreen()));
          }),
          _menuItem(Icons.event_available_outlined, 'Müsaitlik Takvimi', () {
            AvailabilityEditorSheet.show(context);
          }),
          _menuItem(Icons.workspace_premium_outlined,
              '🪪 Belgelerim (Usta Ünvanı)', () {
            context.push('/belgelerim');
          }),
          ..._buildWorkerOnlyItems(context, ref),
          ..._buildCustomerOnlyItems(context, ref),
          _menuItem(Icons.card_giftcard_rounded, '🎁 Arkadaş Davet', () {
            context.push('/sadakat');
          }),
          _menuItem(Icons.confirmation_number_outlined,
              '🎟️ Promosyon Kodu Kullan', () {
            PromoRedeemSheet.show(context);
          }),
          _menuItem(Icons.payments_outlined, 'Kazançlarım', () {
            context.push('/kazanclarim');
          }),
          _menuItem(Icons.history_outlined, 'İşlem Geçmişi', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const EarningsScreen()));
          }),
          _menuItem(Icons.receipt_long_outlined, 'Aylık Beyan', () {
            context.push('/aylik-beyan');
          }),
          // Phase 320 — Favorilerim + Engellenenler menü girişleri gizlendi.
          // Engelleme akışı tamamen UI'dan kaldırıldı; veritabanı kayıtları
          // korunur ama kullanıcı listeleri/eklemeleri göremez.
          _menuItem(Icons.bookmark_border_rounded, 'Kaydedilen İşler', () {
            context.push('/kaydedilen-isler');
          }),
          // Gizlendi (kullanıcı isteği) — Şikayetler artık admin panelden
          // yönetiliyor (admin/disputes); kullanıcı menüsünden kaldırıldı.
          // _menuItem(Icons.flag_outlined, '🚩 Şikayetlerim', () {
          //   context.push('/sikayetlerim');
          // }),
          _menuItem(Icons.notifications_outlined, 'Bildirim Ayarları', () {
            context.push('/bildirim-ayarlari');
          }),
          _menuItem(Icons.notifications_active_outlined, '🔔 Kategori Abonelikleri', () {
            context.push('/kategori-abonelikleri');
          }),
          // Gizlendi (kullanıcı isteği) — Para Birimi seçeneği:
          // _menuItem(Icons.attach_money_rounded, '💱 Para Birimi', () {
          //   CurrencyPickerSheet.show(context);
          // }),
          _menuItem(Icons.location_on_outlined,
              AppLocalizations.of(context).myAddresses, () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AddressesScreen()));
          }),
          _menuItem(Icons.payment_outlined, 'Ödeme Yöntemleri', () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Ödeme yönetimi yakında eklenecek.')),
            );
          }),
          _build2FAMenuItem(context, ref),
          _buildAppearanceItem(context, ref),
          // Gizlendi (kullanıcı isteği) — Dil seçeneği:
          // _buildLanguageItem(context, ref),
          _menuItem(Icons.help_outline, 'Yardım & Destek', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const HelpScreen()));
          }),
          _menuItem(Icons.smart_toy_outlined, '🤖 Yapgitsin Asistan',
              () => context.push('/asistan')),
          const Divider(height: 1, indent: 50),
          _menuItem(Icons.download_outlined, '📥 Verilerimi İndir (KVKK)',
              () => _handleDataExport(context, ref)),
          _menuItem(Icons.privacy_tip_outlined,
              '🗑️ Hesap Verilerimi Sil (KVKK)',
              () => _showDataDeletionDialog(context, ref),
              color: AppColors.error),
          const Divider(height: 1, indent: 50),
          _menuItem(Icons.logout, AppLocalizations.of(context).logout,
              () async {
                // Logout sırası: state'i temizle, sonra ana sekmeye dön ki
                // kullanıcı Profile guest view'inde değil Yaptır sekmesinde
                // landeysin (guest view'in büyük "Giriş Yap" CTA'sını
                // 'login ekranı geliyor' diye yorumlamasın diye).
                await ref.read(authStateProvider.notifier).logout();
                if (!context.mounted) return;
                ref.read(selectedTabProvider.notifier).state = 0;
                // Eğer kullanıcı bir sub-route'taysa root'a yolla.
                context.go('/');
              },
              color: AppColors.error),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showDeleteAccountDialog(context, ref),
                icon: const Icon(Icons.delete_forever, color: AppColors.error),
                label: const Text(
                  'Hesabı Sil',
                  style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDataExport(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('Verileriniz hazırlanıyor...')),
    );
    try {
      final body = await ref.read(firebaseAuthRepositoryProvider).downloadDataExport();
      if (!context.mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
              '✅ Verileriniz hazır (${(body.length / 1024).toStringAsFixed(1)} KB). KVKK Madde 11.'),
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      messenger.showSnackBar(SnackBar(content: Text('Hata: $msg')));
    }
  }

  Future<void> _showDataDeletionDialog(
      BuildContext context, WidgetRef ref) async {
    final reasonCtrl = TextEditingController();
    bool busy = false;
    String? errorText;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Row(
            children: [
              Icon(Icons.privacy_tip_outlined, color: AppColors.error),
              SizedBox(width: 8),
              Expanded(child: Text('Veri Silme Talebi (KVKK)')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'KVKK Madde 11 gereği tüm verilerinizin silinmesini talep edebilirsiniz. '
                'Talep yöneticilerimizce 30 gün içinde değerlendirilir.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                enabled: !busy,
                maxLines: 3,
                maxLength: 500,
                decoration: InputDecoration(
                  labelText: 'Sebep (opsiyonel)',
                  errorText: errorText,
                  border: const OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.of(dialogCtx).pop(),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              onPressed: busy
                  ? null
                  : () async {
                      setState(() {
                        busy = true;
                        errorText = null;
                      });
                      try {
                        await ref
                            .read(firebaseAuthRepositoryProvider)
                            .requestDataDeletion(reasonCtrl.text.trim());
                        if (!ctx.mounted) return;
                        Navigator.of(dialogCtx).pop();
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                '✅ Silme talebiniz alındı. 30 gün içinde değerlendirilecek.'),
                          ),
                        );
                      } catch (e) {
                        final msg =
                            e.toString().replaceFirst('Exception: ', '');
                        setState(() {
                          busy = false;
                          errorText = msg;
                        });
                      }
                    },
              child: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Talep Gönder'),
            ),
          ],
        ),
      ),
    );
  }

  /// Phase 255 (Voldi-fs) — 2-step account deletion confirm.
  /// Step 1: current password.
  /// Step 2: user must type exactly `HESAP SİL` (uppercase, exact match).
  /// On success: backend `DELETE /users/me` (soft-delete + 30d grace), logout,
  /// then redirect to `/account-deleted`.
  Future<void> _showDeleteAccountDialog(
      BuildContext context, WidgetRef ref) async {
    const String confirmPhrase = 'HESAP SİL';
    final passwordCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    int step = 1; // 1 = password, 2 = type-to-confirm
    bool obscure = true;
    bool busy = false;
    String? errorText;
    String capturedPassword = '';

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setState) {
          // ── Step 1: password ─────────────────────────────────────────────
          if (step == 1) {
            return AlertDialog(
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              title: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.error),
                  SizedBox(width: 8),
                  Expanded(child: Text('Hesabı Sil — 1/2')),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '⚠️ Hesabınızı silmek üzeresiniz.',
                    style:
                        TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline,
                            color: AppColors.primary, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '30 gün içinde tekrar giriş yaparak hesabınızı geri yükleyebilirsiniz.',
                            style:
                                TextStyle(fontSize: 12, color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: passwordCtrl,
                    obscureText: obscure,
                    enabled: !busy,
                    decoration: InputDecoration(
                      labelText: 'Mevcut şifre',
                      errorText: errorText,
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                            obscure ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => obscure = !obscure),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: busy ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('İptal'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: busy
                      ? null
                      : () {
                          final pw = passwordCtrl.text;
                          if (pw.isEmpty) {
                            setState(() => errorText = 'Şifrenizi girin');
                            return;
                          }
                          setState(() {
                            capturedPassword = pw;
                            errorText = null;
                            step = 2;
                          });
                        },
                  child: const Text('Devam'),
                ),
              ],
            );
          }

          // ── Step 2: type-to-confirm ──────────────────────────────────────
          final typedOk = confirmCtrl.text == confirmPhrase;
          return AlertDialog(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: const Row(
              children: [
                Icon(Icons.dangerous_outlined, color: AppColors.error),
                SizedBox(width: 8),
                Expanded(child: Text('Hesabı Sil — 2/2')),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Onaylamak için aşağıya tam olarak şunu yazın:',
                  style: TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    confirmPhrase,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                      color: AppColors.error,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: confirmCtrl,
                  enabled: !busy,
                  autocorrect: false,
                  enableSuggestions: false,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'HESAP SİL',
                    errorText: errorText,
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '30 gün içinde hesabınızı geri yükleyebilirsiniz. Süre dolduğunda veriler kalıcı olarak silinir.',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: busy
                    ? null
                    : () => setState(() {
                          step = 1;
                          errorText = null;
                        }),
                child: const Text('Geri'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor:
                      AppColors.error.withValues(alpha: 0.4),
                ),
                onPressed: (!typedOk || busy)
                    ? null
                    : () async {
                        setState(() {
                          busy = true;
                          errorText = null;
                        });
                        try {
                          await ref
                              .read(firebaseAuthRepositoryProvider)
                              .deleteAccount(capturedPassword);
                          if (!ctx.mounted) return;
                          Navigator.of(dialogCtx).pop();
                          await ref.read(authStateProvider.notifier).logout();
                          if (!context.mounted) return;
                          context.go('/account-deleted');
                        } catch (e) {
                          final msg =
                              e.toString().replaceFirst('Exception: ', '');
                          setState(() {
                            busy = false;
                            errorText = msg;
                          });
                        }
                      },
                child: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Hesabı Sil'),
              ),
            ],
          );
        },
      ),
    );
  }

  List<Widget> _buildWorkerOnlyItems(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (!isWorker) return const [];
    return [
      _menuItem(Icons.verified_outlined, '📜 Sertifikalarım', () {
        context.push('/sertifikalarim');
      }),
      _menuItem(Icons.photo_library_outlined, '🖼️ Portfolyom', () {
        context.push('/portfolyo');
      }),
      _menuItem(Icons.note_alt_outlined, 'Teklif Şablonlarım', () {
        context.push('/teklif-sablonlarim');
      }),
      _menuItem(Icons.rocket_launch_rounded, '🚀 Hızlı Boost', () {
        context.push('/boost');
      }),
      _menuItem(Icons.calendar_month_outlined, '📅 Takvim Senkronizasyonu', () {
        context.push('/takvim-sync');
      }),
    ];
  }

  /// Phase 138 — customer (or general) sees message templates entry.
  /// Shown when user is not a worker (workerCategories empty/missing).
  List<Widget> _buildCustomerOnlyItems(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final cats = user['workerCategories'];
    final isWorker = cats is List && cats.isNotEmpty;
    if (isWorker) return const [];
    return [
      _menuItem(Icons.chat_bubble_outline, '💬 Mesaj Şablonlarım', () {
        context.push('/mesaj-sablonlarim');
      }),
    ];
  }

  Widget _build2FAMenuItem(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : <String, dynamic>{};
    final enabled = user['twoFactorEnabled'] == true;

    return ListTile(
      leading: Icon(
        enabled ? Icons.verified_user : Icons.security_outlined,
        color: enabled ? AppColors.verifiedGreen : AppColors.textPrimary,
        size: 22,
      ),
      title: Text('İki Adımlı Doğrulama',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      subtitle: Text(
        enabled ? 'Açık' : 'Kapalı',
        style: TextStyle(
            fontSize: 12,
            color: enabled ? AppColors.verifiedGreen : AppColors.textHint,
            fontWeight: FontWeight.w600),
      ),
      trailing:
          Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: () async {
        if (!enabled) {
          final result = await context.push<bool>('/2fa-setup');
          if (result == true) {
            ref.read(authStateProvider.notifier)
                .updateUserData({'twoFactorEnabled': true});
          }
        } else {
          await _confirmDisable(context, ref);
        }
      },
    );
  }

  Future<void> _confirmDisable(BuildContext context, WidgetRef ref) async {
    final codeController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('2FA Devre Dışı Bırak'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
                'Devre dışı bırakmak için authenticator uygulamanızdaki kodu girin:'),
            const SizedBox(height: 12),
            TextField(
              controller: codeController,
              autofocus: true,
              maxLength: 6,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontFamily: 'monospace', fontSize: 20, letterSpacing: 6),
              decoration: const InputDecoration(
                  counterText: '', hintText: '······'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('İptal')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Devre Dışı Bırak',
                  style: TextStyle(color: AppColors.error))),
        ],
      ),
    );

    if (ok != true) return;
    final code = codeController.text.trim();
    if (code.length != 6) return;

    try {
      await ref.read(firebaseAuthRepositoryProvider).disable2FA(code);
      ref.read(authStateProvider.notifier)
          .updateUserData({'twoFactorEnabled': false});
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('2FA devre dışı bırakıldı'),
              backgroundColor: AppColors.verifiedGreen),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Widget _buildAppearanceItem(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return ListTile(
      leading: Icon(Icons.brightness_6_outlined,
          color: AppColors.textPrimary, size: 22),
      title: Text('Görünüm',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      subtitle: Text(themeModeLabel(mode),
          style: TextStyle(
              fontSize: 12,
              color: AppColors.textHint,
              fontWeight: FontWeight.w600)),
      trailing:
          Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: () => _showAppearanceSheet(context, ref),
    );
  }

  void _showAppearanceSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      useSafeArea: true,
      context: context,
      builder: (ctx) {
        return Consumer(builder: (ctx, ref2, _) {
          final current = ref2.watch(themeModeProvider);
          Widget tile(ThemeMode m, String label, IconData icon) {
            return RadioListTile<ThemeMode>(
              value: m,
              // ignore: deprecated_member_use
              groupValue: current,
              title: Text(label),
              secondary: Icon(icon),
              // ignore: deprecated_member_use
              onChanged: (v) async {
                if (v == null) return;
                await ref2.read(themeModeProvider.notifier).setMode(v);
                if (ctx.mounted) Navigator.pop(ctx);
              },
            );
          }

          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Görünüm',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
                tile(ThemeMode.system, 'Sistem', Icons.settings_suggest_outlined),
                tile(ThemeMode.light, 'Açık', Icons.light_mode_outlined),
                tile(ThemeMode.dark, 'Koyu', Icons.dark_mode_outlined),
                const SizedBox(height: 8),
              ],
            ),
          );
        });
      },
    );
  }

  // Dil menüsü gizlendi (çağrı yorumlu); kod geri açmak için korunuyor.
  // ignore: unused_element
  Widget _buildLanguageItem(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    return ListTile(
      leading: Icon(Icons.language_outlined,
          color: AppColors.textPrimary, size: 22),
      title: Text('Dil / Language',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      subtitle: Text(localeLabel(locale),
          style: TextStyle(
              fontSize: 12,
              color: AppColors.textHint,
              fontWeight: FontWeight.w600)),
      trailing:
          Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: () => _showLanguageSheet(context, ref),
    );
  }

  void _showLanguageSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      useSafeArea: true,
      context: context,
      builder: (ctx) {
        return Consumer(builder: (ctx, ref2, _) {
          final current = ref2.watch(localeProvider);
          Widget tile(Locale loc, String label) {
            return RadioListTile<String>(
              value: loc.languageCode,
              // ignore: deprecated_member_use
              groupValue: current.languageCode,
              title: Text(label),
              secondary: const Icon(Icons.translate_outlined),
              // ignore: deprecated_member_use
              onChanged: (v) async {
                if (v == null) return;
                await ref2.read(localeProvider.notifier).setLocale(loc);
                // PATCH /users/me to persist preferredLang on backend.
                // Phase 241 — Ham Dio kaldırıldı; AuthInterceptor Bearer ekler.
                try {
                  await ref2
                      .read(apiClientProvider)
                      .dio
                      .patch<dynamic>(
                        '/users/me',
                        data: {'preferredLang': loc.languageCode},
                      );
                } catch (_) {
                  // best-effort; local pref already saved
                }
                if (ctx.mounted) Navigator.pop(ctx);
              },
            );
          }

          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Dil / Language',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
                tile(const Locale('tr'), '🇹🇷 Türkçe'),
                tile(const Locale('en'), '🇬🇧 English'),
                tile(const Locale('az'), '🇦🇿 Azərbaycan'),
                const SizedBox(height: 8),
              ],
            ),
          );
        });
      },
    );
  }

  Widget _menuItem(IconData icon, String title, VoidCallback onTap,
      {Color? color}) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppColors.textPrimary, size: 22),
      title: Text(title,
          style: TextStyle(
              color: color ?? AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w500)),
      trailing:
          Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: onTap,
    );
  }
}
