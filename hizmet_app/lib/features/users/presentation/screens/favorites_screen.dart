import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/list_skeleton.dart';
import '../../../providers/presentation/screens/provider_profile_screen.dart';
import '../../data/favorites_provider.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favsAsync = ref.watch(myFavoritesListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Favori Ustalarım'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: favsAsync.when(
        loading: () => ListSkeleton(
          itemCount: 5,
          itemBuilder: (_) => const ProviderCardSkeleton(),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(e.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textHint)),
          ),
        ),
        data: (favs) {
          if (favs.isEmpty) return const _EmptyState();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myFavoritesListProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: favs.length,
              itemBuilder: (_, i) => _FavoriteWorkerCard(worker: favs[i]),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      icon: Icons.favorite_border_rounded,
      title: 'Henüz favori usta yok',
      message:
          'Beğendiğin ustaları kalp ikonuyla kaydet, sonra buradan kolayca ulaş.',
    );
  }
}

class _FavoriteWorkerCard extends ConsumerWidget {
  final Map<String, dynamic> worker;
  const _FavoriteWorkerCard({required this.worker});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = worker['id']?.toString() ?? '';
    final name = (worker['fullName'] ?? '').toString();
    final cats = (worker['workerCategories'] as List?) ?? [];
    final rating = (worker['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (worker['totalReviews'] as num?)?.toInt() ?? 0;
    final city = (worker['city'] ?? '').toString();
    final district = (worker['district'] ?? '').toString();
    final isVerified = worker['identityVerified'] == true;
    final isAvailable = worker['isAvailable'] == true;
    final initials = name.isNotEmpty
        ? name
            .split(' ')
            .take(2)
            .map((w) => w.isNotEmpty ? w[0] : '')
            .join()
            .toUpperCase()
        : '?';

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderProfileScreen(providerId: id),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: AppColors.primaryLight,
                child: Text(initials,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15),
                              overflow: TextOverflow.ellipsis),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded,
                              size: 15, color: Colors.blue),
                        ],
                        if (isAvailable) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                                color: AppColors.success,
                                shape: BoxShape.circle),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(Icons.star_rounded,
                            size: 13, color: Colors.amber.shade600),
                        const SizedBox(width: 2),
                        Text(rating.toStringAsFixed(1),
                            style: const TextStyle(
                                fontSize: 12, fontWeight: FontWeight.w600)),
                        Text(' ($reviews)',
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textHint)),
                      ],
                    ),
                    if (cats.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(cats.take(2).join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500)),
                    ],
                    if (city.isNotEmpty || district.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        [district, city].where((s) => s.isNotEmpty).join(', '),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textHint),
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.favorite, color: AppColors.error),
                tooltip: 'Favorilerden çıkar',
                onPressed: () async {
                  try {
                    await ref
                        .read(favoritesProvider.notifier)
                        .toggle(id);
                    ref.invalidate(myFavoritesListProvider);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.toString())),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
