import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/service_request_repository.dart';
import 'post_service_request_screen.dart';
import 'service_request_detail_screen.dart';

final serviceRequestsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(serviceRequestRepositoryProvider).getAll();
});

/// AppBar'sız versiyon — TabBarView içinde kullanılır
class ServiceRequestBody extends ConsumerWidget {
  const ServiceRequestBody({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(serviceRequestsProvider);
    final isLoggedIn = ref.watch(authStateProvider) is AuthAuthenticated;
    return _ServiceRequestScaffold(
      requestsAsync: requestsAsync,
      isLoggedIn: isLoggedIn,
      showAppBar: false,
      onRefresh: () async => ref.invalidate(serviceRequestsProvider),
      onAddTap: () async {
        await Navigator.push(context,
            MaterialPageRoute(builder: (_) => const PostServiceRequestScreen()));
        ref.invalidate(serviceRequestsProvider);
      },
    );
  }
}

class ServiceRequestScreen extends ConsumerWidget {
  const ServiceRequestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(serviceRequestsProvider);
    final authState = ref.watch(authStateProvider);
    final isLoggedIn = authState is AuthAuthenticated;

    return _ServiceRequestScaffold(
      requestsAsync: requestsAsync,
      isLoggedIn: isLoggedIn,
      showAppBar: true,
      onRefresh: () async => ref.invalidate(serviceRequestsProvider),
      onAddTap: () async {
        await Navigator.push(context,
            MaterialPageRoute(builder: (_) => const PostServiceRequestScreen()));
        ref.invalidate(serviceRequestsProvider);
      },
    );
  }
}

class _ServiceRequestScaffold extends StatelessWidget {
  final AsyncValue<List<Map<String, dynamic>>> requestsAsync;
  final bool isLoggedIn;
  final bool showAppBar;
  final Future<void> Function() onRefresh;
  final VoidCallback onAddTap;

  const _ServiceRequestScaffold({
    required this.requestsAsync,
    required this.isLoggedIn,
    required this.showAppBar,
    required this.onRefresh,
    required this.onAddTap,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: showAppBar
          ? AppBar(
              title: const Text('Hizmet Al',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
            )
          : null,
      floatingActionButton: isLoggedIn
          ? FloatingActionButton.extended(
              onPressed: onAddTap,
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('İlan Ver',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: requestsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (requests) {
          if (requests.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.handshake_outlined, size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  const Text('Henüz hizmet ilanı yok',
                      style: TextStyle(fontSize: 16, color: AppColors.textSecondary)),
                  const SizedBox(height: 8),
                  const Text('İlk ilanı siz verin!',
                      style: TextStyle(color: AppColors.textHint)),
                ],
              ),
            );
          }
          final featured = requests
              .where((r) => r['featuredOrder'] != null)
              .toList()
            ..sort((a, b) => (a['featuredOrder'] as int).compareTo(b['featuredOrder'] as int));
          final regular = requests.where((r) => r['featuredOrder'] == null).toList();

          return RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                if (featured.isNotEmpty) ...[
                  _sectionHeader('⭐ Öne Çıkan İlanlar'),
                  SizedBox(
                    height: 180,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: featured.length,
                      itemBuilder: (_, i) => _FeaturedCard(item: featured[i]),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _sectionHeader('Tüm İlanlar'),
                ],
                ...regular.map((r) => _RequestCard(item: r)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _sectionHeader(String title) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        child: Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.textPrimary)),
      );
}

class _FeaturedCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _FeaturedCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ServiceRequestDetailScreen(item: item),
        ),
      ),
      child: Container(
      width: 200,
      margin: const EdgeInsets.only(right: 12, bottom: 8, top: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.amber.shade200, width: 1.5),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (item['imageUrl'] != null)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: Image.network(item['imageUrl'],
                  height: 80,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      Container(height: 80, color: AppColors.background)),
            )
          else
            Container(
              height: 80,
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: const Center(
                  child: Icon(Icons.handshake_outlined,
                      size: 36, color: AppColors.primary)),
            ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['title'] ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.location_on_outlined,
                      size: 12, color: AppColors.textHint),
                  const SizedBox(width: 2),
                  Expanded(
                      child: Text(item['location'] ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary))),
                ]),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(6)),
                  child: Text('⭐ Öne Çıkan',
                      style: TextStyle(
                          fontSize: 9,
                          color: Colors.amber.shade700,
                          fontWeight: FontWeight.bold)),
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

class _RequestCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _RequestCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final user = item['user'] as Map<String, dynamic>?;
    final name = user?['fullName'] ?? 'Kullanıcı';
    final initials = name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();
    final category = item['category'] ?? '';
    final createdAt =
        item['createdAt'] != null ? DateTime.tryParse(item['createdAt']) : null;
    final dateStr = createdAt != null
        ? '${createdAt.day}.${createdAt.month}.${createdAt.year}'
        : '';

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ServiceRequestDetailScreen(item: item),
        ),
      ),
      child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (item['imageUrl'] != null)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(13)),
              child: Image.network(item['imageUrl'],
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink()),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (category.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(8)),
                        child: Text(category,
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600)),
                      ),
                    const Spacer(),
                    Text(dateStr,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textHint)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(item['title'] ?? '',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(item['description'] ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(initials,
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary)),
                    ),
                    const SizedBox(width: 8),
                    Text(name,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w500)),
                    const Spacer(),
                    const Icon(Icons.location_on_outlined,
                        size: 13, color: AppColors.textHint),
                    const SizedBox(width: 2),
                    Text(item['location'] ?? '',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                  ],
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
