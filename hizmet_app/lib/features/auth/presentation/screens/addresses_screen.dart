import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/api_constants.dart';
import '../providers/auth_provider.dart';

// ── Model ─────────────────────────────────────────────────────────────────────
class SavedAddress {
  final String id;
  final String title;
  final String city;
  final String district;
  final String address;
  final bool isDefault;

  SavedAddress({
    required this.id,
    required this.title,
    required this.city,
    required this.district,
    required this.address,
    this.isDefault = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'city': city,
        'district': district,
        'address': address,
        'isDefault': isDefault,
      };

  factory SavedAddress.fromJson(Map<String, dynamic> j) => SavedAddress(
        id: j['id'] as String? ?? '',
        title: j['title'] as String? ?? '',
        city: j['city'] as String? ?? '',
        district: j['district'] as String? ?? '',
        address: j['address'] as String? ?? '',
        isDefault: j['isDefault'] as bool? ?? false,
      );

  SavedAddress copyWith(
          {String? title,
          String? city,
          String? district,
          String? address,
          bool? isDefault}) =>
      SavedAddress(
        id: id,
        title: title ?? this.title,
        city: city ?? this.city,
        district: district ?? this.district,
        address: address ?? this.address,
        isDefault: isDefault ?? this.isDefault,
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────
final addressesProvider =
    StateNotifierProvider<AddressesNotifier, List<SavedAddress>>((ref) {
  return AddressesNotifier(ref);
});

class AddressesNotifier extends StateNotifier<List<SavedAddress>> {
  final Ref _ref;
  static const _key = 'saved_addresses';

  AddressesNotifier(this._ref) : super([]) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List;
        state = list
            .map((e) => SavedAddress.fromJson(e as Map<String, dynamic>))
            .toList();
        return;
      } catch (_) {}
    }
    // Kullanıcının mevcut adresini varsayılan olarak al
    final auth = _ref.read(authStateProvider);
    if (auth is AuthAuthenticated) {
      final city = auth.user['city'] as String? ?? '';
      final district = auth.user['district'] as String? ?? '';
      final address = auth.user['address'] as String? ?? '';
      if (city.isNotEmpty || address.isNotEmpty) {
        state = [
          SavedAddress(
            id: 'default',
            title: 'Ev',
            city: city,
            district: district,
            address: address,
            isDefault: true,
          ),
        ];
        await _persist();
      }
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _key, jsonEncode(state.map((a) => a.toJson()).toList()));
  }

  Future<void> add(SavedAddress addr) async {
    // Eğer yeni adres varsayılan ise diğerlerini kaldır
    List<SavedAddress> next = addr.isDefault
        ? state.map((a) => a.copyWith(isDefault: false)).toList()
        : List.from(state);
    state = [...next, addr];
    await _persist();
    if (addr.isDefault) await _syncToProfile(addr);
  }

  Future<void> update(SavedAddress addr) async {
    List<SavedAddress> next = state.map((a) {
      if (a.id == addr.id) return addr;
      return addr.isDefault ? a.copyWith(isDefault: false) : a;
    }).toList();
    state = next;
    await _persist();
    if (addr.isDefault) await _syncToProfile(addr);
  }

  Future<void> remove(String id) async {
    state = state.where((a) => a.id != id).toList();
    await _persist();
  }

  Future<void> setDefault(String id) async {
    state = state.map((a) => a.copyWith(isDefault: a.id == id)).toList();
    await _persist();
    final def = state.firstWhere((a) => a.id == id, orElse: () => state.first);
    await _syncToProfile(def);
  }

  Future<void> _syncToProfile(SavedAddress addr) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) return;
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
      await dio.patch(
        '/users/me',
        data: {
          'city': addr.city,
          'district': addr.district,
          'address': addr.address
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } catch (_) {}
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────
class AddressesScreen extends ConsumerWidget {
  const AddressesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(addressesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Adreslerim'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Adres Ekle',
            onPressed: () => _showAddressForm(context, ref, null),
          ),
        ],
      ),
      body: addresses.isEmpty
          ? _buildEmpty(context, ref)
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: addresses.length,
              itemBuilder: (_, i) => _AddressCard(
                addr: addresses[i],
                onEdit: () => _showAddressForm(context, ref, addresses[i]),
                onDelete: () => _confirmDelete(context, ref, addresses[i]),
                onSetDefault: () => ref
                    .read(addressesProvider.notifier)
                    .setDefault(addresses[i].id),
              ),
            ),
      floatingActionButton: addresses.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => _showAddressForm(context, ref, null),
              icon: const Icon(Icons.add_location_alt_outlined),
              label: const Text('Adres Ekle'),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            )
          : null,
    );
  }

  Widget _buildEmpty(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_off_outlined,
                size: 72, color: Colors.grey.shade300),
            const SizedBox(height: 20),
            const Text('Kayıtlı adresiniz yok',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            const Text('Hızlı sipariş için adres ekleyin.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: () => _showAddressForm(context, ref, null),
              icon: const Icon(Icons.add_location_alt_outlined),
              label: const Text('İlk Adresimi Ekle'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddressForm(
      BuildContext context, WidgetRef ref, SavedAddress? existing) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddressForm(existing: existing, ref: ref),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, SavedAddress addr) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Adresi Sil'),
        content: Text('"${addr.title}" adresini silmek istiyor musunuz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('İptal')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(addressesProvider.notifier).remove(addr.id);
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
  }
}

// ── Address Card ─────────────────────────────────────────────────────────────
class _AddressCard extends StatelessWidget {
  final SavedAddress addr;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onSetDefault;

  const _AddressCard({
    required this.addr,
    required this.onEdit,
    required this.onDelete,
    required this.onSetDefault,
  });

  IconData get _icon {
    switch (addr.title.toLowerCase()) {
      case 'ev':
        return Icons.home_outlined;
      case 'iş':
        return Icons.business_outlined;
      case 'okul':
        return Icons.school_outlined;
      default:
        return Icons.location_on_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: addr.isDefault ? AppColors.primary : AppColors.border,
          width: addr.isDefault ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_icon, size: 20, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text(addr.title,
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary)),
                        if (addr.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Varsayılan',
                                style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ]),
                      if (addr.city.isNotEmpty)
                        Text(
                            '${addr.city}${addr.district.isNotEmpty ? ", ${addr.district}" : ""}',
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary)),
                    ]),
              ),
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                  if (v == 'default') onSetDefault();
                },
                itemBuilder: (_) => [
                  if (!addr.isDefault)
                    const PopupMenuItem(
                        value: 'default', child: Text('Varsayılan Yap')),
                  const PopupMenuItem(value: 'edit', child: Text('Düzenle')),
                  const PopupMenuItem(
                      value: 'delete',
                      child: Text('Sil', style: TextStyle(color: Colors.red))),
                ],
                child: const Icon(Icons.more_vert, color: AppColors.textHint),
              ),
            ]),
            if (addr.address.isNotEmpty) ...[
              const SizedBox(height: 10),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.map_outlined,
                    size: 14, color: AppColors.textHint),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(addr.address,
                      style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4)),
                ),
              ]),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Address Form (BottomSheet) ────────────────────────────────────────────────
class _AddressForm extends StatefulWidget {
  final SavedAddress? existing;
  final WidgetRef ref;
  const _AddressForm({this.existing, required this.ref});

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _cityCtrl;
  late final TextEditingController _districtCtrl;
  late final TextEditingController _addressCtrl;
  bool _isDefault = false;
  bool _loading = false;

  final _titles = ['Ev', 'İş', 'Okul', 'Diğer'];

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.existing?.title ?? 'Ev');
    _cityCtrl = TextEditingController(text: widget.existing?.city ?? '');
    _districtCtrl =
        TextEditingController(text: widget.existing?.district ?? '');
    _addressCtrl = TextEditingController(text: widget.existing?.address ?? '');
    _isDefault = widget.existing?.isDefault ?? false;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _cityCtrl.dispose();
    _districtCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_cityCtrl.text.trim().isEmpty && _addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Şehir veya adres giriniz.')));
      return;
    }
    setState(() => _loading = true);
    final addr = SavedAddress(
      id: widget.existing?.id ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      title: _titleCtrl.text.trim().isEmpty ? 'Adres' : _titleCtrl.text.trim(),
      city: _cityCtrl.text.trim(),
      district: _districtCtrl.text.trim(),
      address: _addressCtrl.text.trim(),
      isDefault: _isDefault,
    );
    if (widget.existing != null) {
      await widget.ref.read(addressesProvider.notifier).update(addr);
    } else {
      await widget.ref.read(addressesProvider.notifier).add(addr);
    }
    setState(() => _loading = false);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 20),
            Text(widget.existing != null ? 'Adresi Düzenle' : 'Yeni Adres',
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),

            // Etiket seçimi
            const Text('Adres Etiketi',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _titles.map((t) {
                final sel = _titleCtrl.text == t;
                return ChoiceChip(
                  label: Text(t),
                  selected: sel,
                  onSelected: (_) => setState(() => _titleCtrl.text = t),
                  selectedColor: AppColors.primaryLight,
                  labelStyle: TextStyle(
                      color: sel ? AppColors.primary : AppColors.textPrimary,
                      fontWeight: sel ? FontWeight.bold : FontWeight.normal),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            _field(_cityCtrl, 'Şehir *', Icons.location_city_outlined,
                TextInputType.text),
            const SizedBox(height: 12),
            _field(
                _districtCtrl, 'İlçe', Icons.map_outlined, TextInputType.text),
            const SizedBox(height: 12),
            TextField(
              controller: _addressCtrl,
              maxLines: 3,
              decoration: _inputDeco('Açık Adres', Icons.home_outlined),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              value: _isDefault,
              onChanged: (v) => setState(() => _isDefault = v),
              title: const Text('Varsayılan adres olarak ayarla',
                  style: TextStyle(fontSize: 14)),
              activeThumbColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Text(widget.existing != null ? 'Güncelle' : 'Ekle',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      TextInputType kb) {
    return TextField(
      controller: ctrl,
      keyboardType: kb,
      textCapitalization: TextCapitalization.words,
      decoration: _inputDeco(label, icon),
    );
  }

  InputDecoration _inputDeco(String label, IconData icon) => InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: AppColors.background,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
      );
}
