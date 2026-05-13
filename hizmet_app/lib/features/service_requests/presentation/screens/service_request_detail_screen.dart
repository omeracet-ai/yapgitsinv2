import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/service_request_repository.dart';

class ServiceRequestDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> item;
  const ServiceRequestDetailScreen({super.key, required this.item});

  @override
  ConsumerState<ServiceRequestDetailScreen> createState() =>
      _ServiceRequestDetailScreenState();
}

class _ServiceRequestDetailScreenState
    extends ConsumerState<ServiceRequestDetailScreen> {
  bool _showApplyForm = false;
  final _messageCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _applied = false;
  bool _converting = false;
  bool _converted = false;

  @override
  void dispose() {
    _messageCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _convertToJob() async {
    final id = widget.item['id'] as String?;
    if (id == null) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Teklif akışına geç'),
        content: const Text(
          'Bu hizmet talebini iş ilanına çevir? '
          'Mevcut başvurular kapanır, yeni teklif sistemi açılır.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Vazgeç'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    setState(() => _converting = true);
    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      await repo.convertToJob(id);
      if (!mounted) return;
      setState(() {
        _converted = true;
        _converting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('İlan oluşturuldu! Teklifler bekleniyor.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _converting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _apply() async {
    final message = _messageCtrl.text.trim();
    if (message.isEmpty) {
      setState(() => _error = 'Lütfen bir mesaj yazın.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      final id = widget.item['id'] as String;
      final priceText = _priceCtrl.text.trim();
      final price = priceText.isNotEmpty ? double.tryParse(priceText) : null;

      await repo.apply(id, message: message, price: price);

      if (mounted) {
        setState(() {
          _applied = true;
          _showApplyForm = false;
          _loading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Başvurunuz gönderildi!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final authState = ref.watch(authStateProvider);
    final isLoggedIn = authState is AuthAuthenticated;
    final currentUserId = isLoggedIn ? (authState).user['id'] as String? : null;
    final ownerId = item['userId'] as String?;
    final isOwner = currentUserId != null && currentUserId == ownerId;

    final user = item['user'] as Map<String, dynamic>?;
    final ownerName = user?['fullName'] as String? ?? 'Kullanıcı';
    final ownerInitials = ownerName
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    final title = item['title'] as String? ?? '';
    final description = item['description'] as String? ?? '';
    final category = item['category'] as String? ?? '';
    final location = item['location'] as String? ?? '';
    final address = item['address'] as String?;
    final imageUrl = item['imageUrl'] as String?;
    final createdAt =
        item['createdAt'] != null ? DateTime.tryParse(item['createdAt']) : null;
    // P190/4 — IntlFormatter.date (locale-aware).
    final dateStr = createdAt != null ? IntlFormatter.date(context, createdAt) : '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('İlan Detayı',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image
            if (imageUrl != null)
              Image.network(
                imageUrl,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) =>
                    Container(height: 200, color: AppColors.background),
              )
            else
              Container(
                height: 140,
                color: AppColors.primaryLight,
                child: const Center(
                  child: Icon(Icons.handshake_outlined,
                      size: 56, color: AppColors.primary),
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category + date row
                  Row(
                    children: [
                      if (category.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(category,
                              style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600)),
                        ),
                      const Spacer(),
                      Text(dateStr,
                          style: const TextStyle(
                              color: AppColors.textHint, fontSize: 12)),
                    ],
                  ),

                  const SizedBox(height: 12),
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                          color: AppColors.textPrimary)),

                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.location_on_outlined,
                        size: 14, color: AppColors.textHint),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        address != null && address.isNotEmpty
                            ? '$location · $address'
                            : location,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  ]),

                  const SizedBox(height: 16),
                  const Text('Açıklama',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 6),
                  Text(description,
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          height: 1.5)),

                  const SizedBox(height: 20),

                  // Owner info
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primaryLight,
                          child: Text(ownerInitials,
                              style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14)),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(ownerName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14)),
                            const Text('İlan Sahibi',
                                style: TextStyle(
                                    color: AppColors.textHint, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Apply button / form (only for logged-in non-owners)
                  if (isLoggedIn && !isOwner && !_applied) ...[
                    if (!_showApplyForm)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              setState(() => _showApplyForm = true),
                          icon: const Icon(Icons.send_outlined,
                              color: Colors.white),
                          label: const Text('Başvur',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      )
                    else
                      _buildApplyForm(),
                  ],

                  if (_applied) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.check_circle_outline,
                              color: Colors.green.shade600),
                          const SizedBox(width: 10),
                          Text('Başvurunuz gönderildi!',
                              style: TextStyle(
                                  color: Colors.green.shade700,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14)),
                        ],
                      ),
                    ),
                  ],

                  if (!isLoggedIn) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline, color: AppColors.primary),
                          SizedBox(width: 10),
                          Text('Başvurmak için giriş yapın.',
                              style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ],

                  if (isOwner) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.person_outline, color: AppColors.textHint),
                          SizedBox(width: 10),
                          Text('Bu sizin ilanınız.',
                              style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                    if ((item['status'] as String? ?? 'open') == 'open' &&
                        !_converted) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _converting ? null : _convertToJob,
                          icon: _converting
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Icon(Icons.swap_horiz,
                                  color: Colors.white),
                          label: const Text('Teklif Akışına Geç',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'İlanını açık-teklif sistemine çevir; ustalar fiyat verir.',
                        style: TextStyle(
                            color: AppColors.textHint, fontSize: 12),
                      ),
                    ],
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildApplyForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Başvurunuzu Gönderin',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),

          // Price (optional)
          TextField(
            controller: _priceCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Fiyat Teklifi ₺ (opsiyonel)',
              prefixIcon: Icon(Icons.attach_money),
              filled: true,
              fillColor: AppColors.background,
            ),
          ),
          const SizedBox(height: 10),

          // Message (required)
          TextField(
            controller: _messageCtrl,
            maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Mesajınız *',
              prefixIcon: Icon(Icons.message_outlined),
              alignLabelWithHint: true,
              filled: true,
              fillColor: AppColors.background,
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(_error!,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
            ),
          ],

          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _loading
                      ? null
                      : () => setState(() {
                            _showApplyForm = false;
                            _error = null;
                          }),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Vazgeç'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _loading ? null : _apply,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Gönder',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
