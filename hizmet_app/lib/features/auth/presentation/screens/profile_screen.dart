import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../wallet/presentation/screens/wallet_screen.dart';
import '../../../tokens/data/token_repository.dart';
import '../../../tokens/presentation/screens/token_screen.dart';
import '../providers/auth_provider.dart';
import 'personal_info_screen.dart';
import 'addresses_screen.dart';
import 'help_screen.dart';
import '../../../../core/constants/api_constants.dart';
import 'package:dio/dio.dart';

// ── Provider: kendi profil verisini çeker (stats + yorumlar + fotoğraflar) ──
final myPublicProfileProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return {};
  final userId = auth.user['id'] as String;
  final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
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
        title: const Text('Profil'),
        backgroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myPublicProfileProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildProfileHeader(user),
              // TOKEN_HIDDEN — yeniden göstermek için aşağıdaki satırı aç:
              // _buildTokenBanner(context, ref),
              _buildIdentityStatus(user),
              _buildStatsSection(ref),
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
          title: const Text('Profil'), backgroundColor: AppColors.primary),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.account_circle_outlined,
                  size: 80, color: AppColors.textHint),
              const SizedBox(height: 24),
              const Text('Profilinizi görüntülemek için giriş yapın.',
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(fontSize: 16, color: AppColors.textSecondary)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/login'),
                  child: const Text('Giriş Yap'),
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
    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

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
                    onPressed: () {},
                  ),
                ],
              ),
              if (repScore > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
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
      bgColor = Colors.green.shade50;
      borderColor = Colors.green.shade300;
      icon = Icons.verified_user;
      title = 'Kimlik Doğrulandı';
      subtitle = 'Hesabınız onaylıdır.';
    } else if (hasIdentity) {
      bgColor = Colors.orange.shade50;
      borderColor = Colors.orange.shade300;
      icon = Icons.hourglass_empty;
      title = 'Kimlik İnceleniyor';
      subtitle = 'Doğrulama süreci devam ediyor.';
    } else {
      bgColor = Colors.red.shade50;
      borderColor = Colors.red.shade300;
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

  // ignore: unused_element — token banner feature reserved for future use
  Widget _buildTokenBanner(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    return GestureDetector(
      onTap: () => Navigator.push(
          context, MaterialPageRoute(builder: (_) => const TokenScreen())),
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
              const Text('Sanal Token Bakiyesi',
                  style: TextStyle(color: Colors.white70, fontSize: 12)),
              balanceAsync.when(
                data: (b) => Text('$b Token',
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
                      color: Colors.blue,
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
                      color: Colors.green,
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
          color: Colors.white,
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
          const Text('başarı oranı',
              style: TextStyle(fontSize: 11, color: AppColors.textHint)),
          const SizedBox(height: 10),
          _statRow('Toplam', total, Colors.grey.shade700),
          const SizedBox(height: 2),
          _statRow('Başarılı', success, Colors.green.shade600),
          const SizedBox(height: 2),
          _statRow('Başarısız', fail, Colors.red.shade400),
          if (total > 0) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? success / total : 0,
                backgroundColor: Colors.red.shade100,
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
                const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        Text('$value',
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
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
                      style: const TextStyle(
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
          color: Colors.grey.shade200,
          child: const Icon(Icons.image_not_supported_outlined,
              color: AppColors.textHint),
        ),
        loadingBuilder: (_, child, progress) {
          if (progress == null) return child;
          return Container(
            color: Colors.grey.shade100,
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
                    style: const TextStyle(
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
    final reviewer = r['reviewer'] as Map<String, dynamic>? ?? {};
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

    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
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
                          style: const TextStyle(
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
                style: const TextStyle(
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          _menuItem(Icons.person_outline, 'Kişisel Bilgiler', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
          }),
          _menuItem(Icons.account_balance_wallet_outlined, 'Cüzdanım', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const WalletScreen()));
          }),
          _menuItem(Icons.location_on_outlined, 'Adreslerim', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AddressesScreen()));
          }),
          _menuItem(Icons.payment_outlined, 'Ödeme Yöntemleri', () {}),
          _menuItem(Icons.help_outline, 'Yardım & Destek', () {
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const HelpScreen()));
          }),
          const Divider(height: 1, indent: 50),
          _menuItem(Icons.logout, 'Çıkış Yap',
              () => ref.read(authStateProvider.notifier).logout(),
              color: Colors.redAccent),
        ],
      ),
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
          const Icon(Icons.chevron_right, size: 20, color: AppColors.textHint),
      onTap: onTap,
    );
  }
}
