import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../categories/data/category_repository.dart';
import '../../../users/widgets/badge_row.dart';
import '../../../users/widgets/favorite_button.dart';
import '../../data/provider_repository.dart';
import '../../data/worker_filter.dart';
import '../../widgets/worker_filter_sheet.dart';
import 'provider_profile_screen.dart';

class ProviderListScreen extends ConsumerStatefulWidget {
  final String? initialSearch;
  const ProviderListScreen({super.key, this.initialSearch});

  @override
  ConsumerState<ProviderListScreen> createState() => _ProviderListScreenState();
}

class _ProviderListScreenState extends ConsumerState<ProviderListScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String? _activeCategory;
  _SortMode _sort = _SortMode.rating;

  @override
  void initState() {
    super.initState();
    if (widget.initialSearch?.isNotEmpty == true) {
      _search = widget.initialSearch!;
      _activeCategory = widget.initialSearch;
      _searchCtrl.text = widget.initialSearch!;
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _openFilterSheet() async {
    final current = ref.read(workerFilterProvider);
    final result = await showModalBottomSheet<WorkerFilter>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => WorkerFilterSheet(initial: current),
    );
    if (result != null && mounted) {
      ref.read(workerFilterProvider.notifier).state = result;
    }
  }

  void _selectCategory(String? cat) => setState(() {
        if (_activeCategory == cat) {
          _activeCategory = null;
          _search = '';
          _searchCtrl.clear();
        } else {
          _activeCategory = cat;
          _search = cat ?? '';
          _searchCtrl.text = cat ?? '';
        }
      });

  @override
  Widget build(BuildContext context) {
    final providersAsync = ref.watch(allProvidersProvider(_search));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [_buildAppBar(ctx)],
        body: providersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _errorState(e.toString()),
          data: (providers) => _buildList(providers),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    final activeCount = ref.watch(workerFilterProvider).activeCount;
    return SliverAppBar(
      pinned: true,
      expandedHeight: 160,
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              IconButton(
                tooltip: 'Filtrele',
                icon: const Icon(Icons.tune_rounded, color: Colors.white),
                onPressed: _openFilterSheet,
              ),
              if (activeCount > 0)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 5, vertical: 1),
                    constraints:
                        const BoxConstraints(minWidth: 16, minHeight: 16),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.primary, width: 1.5),
                    ),
                    child: Text('$activeCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const SafeArea(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 50, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Ustalar',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Doğrulanmış ustalarla tanışın',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),
          ),
        ),
        collapseMode: CollapseMode.pin,
        title: const Text('Ustalar', style: TextStyle(color: Colors.white)),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(112),
        child: Container(
          color: AppColors.primary,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            children: [
              // Search bar
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 3))
                  ],
                ),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() {
                    _search = v.trim();
                    _activeCategory = null;
                  }),
                  decoration: InputDecoration(
                    hintText: 'İsim veya hizmet ara...',
                    hintStyle:
                        const TextStyle(color: AppColors.textHint, fontSize: 14),
                    prefixIcon: const Icon(Icons.search,
                        color: AppColors.textHint, size: 20),
                    suffixIcon: _search.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => setState(() {
                              _searchCtrl.clear();
                              _search = '';
                              _activeCategory = null;
                            }),
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              // Category chips
              SizedBox(
                height: 34,
                child: ref.watch(categoriesProvider).when(
                  data: (cats) => ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _chip('Tümü', null, _activeCategory == null),
                      ...cats.map((c) {
                        final n = c['name'] as String? ?? '';
                        final e = c['icon'] as String? ?? '';
                        return _chip('$e $n'.trim(), n, _activeCategory == n);
                      }),
                    ],
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String label, String? value, bool active) => GestureDetector(
        onTap: () => _selectCategory(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color:
                  active ? Colors.white : Colors.white.withValues(alpha: 0.35),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active ? AppColors.primary : Colors.white,
            ),
          ),
        ),
      );

  Widget _buildList(List<Map<String, dynamic>> providers) {
    if (providers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                  color: AppColors.primaryLight, shape: BoxShape.circle),
              child: const Icon(Icons.person_search_rounded,
                  size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              _search.isEmpty
                  ? 'Henüz usta bulunamadı.'
                  : 'Aramanızla eşleşen usta yok.',
              style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500),
            ),
            if (_search.isNotEmpty) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => setState(() {
                  _search = '';
                  _activeCategory = null;
                  _searchCtrl.clear();
                }),
                child: const Text('Aramayı Temizle'),
              ),
            ],
          ],
        ),
      );
    }

    final featured =
        providers.where((p) => p['featuredOrder'] != null).toList()
          ..sort((a, b) =>
              (a['featuredOrder'] as int).compareTo(b['featuredOrder'] as int));
    final regular =
        providers.where((p) => p['featuredOrder'] == null).toList();

    // Sort regular list
    if (_sort == _SortMode.rating) {
      regular.sort((a, b) => ((b['averageRating'] as num?) ?? 0)
          .compareTo((a['averageRating'] as num?) ?? 0));
    }

    return CustomScrollView(
      slivers: [
        // Sort bar
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            child: Row(
              children: [
                Text('${providers.length} usta bulundu',
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
                const Spacer(),
                _sortChip(_SortMode.rating, 'En Yüksek Puan'),
                const SizedBox(width: 8),
                _sortChip(_SortMode.reviews, 'En Çok Yorum'),
              ],
            ),
          ),
        ),

        // Featured horizontal carousel
        if (featured.isNotEmpty && _search.isEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                          colors: [Colors.amber.shade400, Colors.amber.shade600]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.workspace_premium_rounded,
                            color: Colors.white, size: 13),
                        SizedBox(width: 4),
                        Text('Öne Çıkan Ustalar',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(left: 16, right: 4),
                itemCount: featured.length,
                itemBuilder: (_, i) => _FeaturedCard(provider: featured[i]),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Row(
                children: [
                  const Text('Tüm Ustalar',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  Text('(${regular.length})',
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textHint)),
                ],
              ),
            ),
          ),
        ],

        // Regular list
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, i) => _ProviderCard(provider: regular[i]),
              childCount: regular.length,
            ),
          ),
        ),
      ],
    );
  }

  Widget _sortChip(_SortMode mode, String label) {
    final active = _sort == mode;
    return GestureDetector(
      onTap: () => setState(() => _sort = mode),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: active ? AppColors.primary : AppColors.border),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : AppColors.textSecondary)),
      ),
    );
  }

  Widget _errorState(String msg) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(msg, style: const TextStyle(color: AppColors.textHint)),
          ],
        ),
      );
}

enum _SortMode { rating, reviews }

// ─── Featured Card (horizontal carousel) ─────────────────────────────────────

class _FeaturedCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  const _FeaturedCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final user = provider['user'] as Map<String, dynamic>?;
    final name = (provider['businessName'] ?? user?['fullName'] ?? '').toString();
    final bio = (provider['bio'] ?? '').toString();
    final rating = (provider['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (provider['totalReviews'] as num?)?.toInt() ?? 0;
    final isVerified = provider['isVerified'] == true;
    final cats = provider['categories'] as List? ?? [];
    final initials = name.isNotEmpty
        ? name.split(' ').take(2).map((w) => w.isNotEmpty ? w[0] : '').join().toUpperCase()
        : '?';

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderProfileScreen(providerId: provider['id'].toString()),
      )),
      child: Container(
        width: 170,
        margin: const EdgeInsets.only(right: 12, bottom: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.amber.shade300, width: 1.5),
          boxShadow: [
            BoxShadow(
                color: Colors.amber.withValues(alpha: 0.12),
                blurRadius: 12,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Stack(
          children: [
            if ((user?['id']?.toString() ?? '').isNotEmpty)
              Positioned(
                top: 4,
                right: 4,
                child: FavoriteButton(
                    workerId: user!['id'].toString(), size: 18),
              ),
            Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: Colors.amber.shade100,
                    child: Text(initials,
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade800)),
                  ),
                  if (isVerified)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: const BoxDecoration(
                            color: Colors.blue, shape: BoxShape.circle),
                        child: const Icon(Icons.check, size: 12, color: Colors.white),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(name,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.star_rounded, size: 13, color: Colors.amber.shade600),
                  const SizedBox(width: 2),
                  Text(rating.toStringAsFixed(1),
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                  Text(' ($reviews)', style: const TextStyle(fontSize: 11, color: AppColors.textHint)),
                ],
              ),
              if (bio.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(bio,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AppColors.textHint)),
              ],
              if (cats.isNotEmpty) ...[
                const Spacer(),
                Text(cats.take(2).join(' · '),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w500)),
              ],
            ],
          ),
        ),
          ],
        ),
      ),
    );
  }
}

// ─── Regular Provider Card ────────────────────────────────────────────────────

class _ProviderCard extends StatelessWidget {
  final Map<String, dynamic> provider;
  const _ProviderCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final user = provider['user'] as Map<String, dynamic>?;
    final name = (provider['businessName'] ?? user?['fullName'] ?? '').toString();
    final bio = (provider['bio'] ?? '').toString();
    final rating = (provider['averageRating'] as num?)?.toDouble() ?? 0.0;
    final reviews = (provider['totalReviews'] as num?)?.toInt() ?? 0;
    final isVerified = provider['isVerified'] == true;
    final isAvailable = provider['isAvailable'] == true;
    final cats = provider['categories'] as List? ?? [];
    final badges = (provider['badges'] as List?) ??
        (user?['badges'] as List?);
    final rateMin = (provider['hourlyRateMin'] as num?)?.toInt();
    final rateMax = (provider['hourlyRateMax'] as num?)?.toInt();
    final initials = name.isNotEmpty
        ? name.split(' ').take(2).map((w) => w.isNotEmpty ? w[0] : '').join().toUpperCase()
        : '?';

    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderProfileScreen(providerId: provider['id'].toString()),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              Stack(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primaryLight,
                    child: Text(initials,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.primary)),
                  ),
                  if (isAvailable)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                  if (isVerified && !isAvailable)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: const BoxDecoration(
                            color: Colors.blue, shape: BoxShape.circle),
                        child: const Icon(Icons.check, size: 11, color: Colors.white),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded,
                              size: 16, color: Colors.blue),
                        ],
                        if (isAvailable) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Müsait',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.success)),
                          ),
                        ],
                      ],
                    ),

                    // Rating row
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        ...List.generate(
                          5,
                          (i) => Icon(
                            i < rating.floor()
                                ? Icons.star
                                : (i < rating ? Icons.star_half : Icons.star_border),
                            size: 13,
                            color: Colors.amber.shade600,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(rating.toStringAsFixed(1),
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary)),
                        Text(' ($reviews yorum)',
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textHint)),
                      ],
                    ),

                    // Bio
                    if (bio.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(bio,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              height: 1.4)),
                    ],

                    // Categories
                    if (cats.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: cats
                            .take(3)
                            .map((c) => Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(c.toString(),
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w500)),
                                ))
                            .toList(),
                      ),
                    ],

                    // Rate
                    if (rateMin != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.payments_outlined,
                              size: 13, color: AppColors.textHint),
                          const SizedBox(width: 4),
                          Text(
                            rateMax != null
                                ? '$rateMin–$rateMax ₺/sa'
                                : '$rateMin ₺/sa',
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if ((user?['id']?.toString() ?? '').isNotEmpty)
                    FavoriteButton(workerId: user!['id'].toString())
                  else
                    const SizedBox(height: 34),
                  const Icon(Icons.chevron_right,
                      color: AppColors.textHint, size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
