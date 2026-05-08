import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/api_constants.dart';
import '../providers/auth_provider.dart';
import '../../../service_requests/data/service_request_repository.dart';
import '../../../profile/widgets/profile_completion_card.dart';
import '../../../photos/data/photo_repository.dart';
import '../../../insurance/data/insurance_repository.dart';

// Phase 62 — Sectioned Profile Edit UX
//
// Mevcut PATCH /users/me akışı korunur. Bölümler bağımsız submit edebilir,
// üstte profileCompletion (%X) chip + her bölümde missingFields highlight.

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  // Personal
  final _nameCtrl = TextEditingController();
  String _gender = 'other';
  DateTime? _birthDate;

  // Contact
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();

  // Address
  final _cityCtrl = TextEditingController();
  final _districtCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();

  // Worker
  final _bioCtrl = TextEditingController();
  final _hourlyMinCtrl = TextEditingController();
  final _hourlyMaxCtrl = TextEditingController();
  List<String> _workerCategories = const [];
  bool _isAvailable = false;
  bool _isWorker = false;

  // Identity
  File? _newIdentityPhoto;
  String? _currentIdentityUrl;
  bool _identityVerified = false;

  // Section loading
  String? _busySection;

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  void _prefill() {
    final auth = ref.read(authStateProvider);
    if (auth is! AuthAuthenticated) return;
    final u = auth.user;
    _nameCtrl.text = (u['fullName'] as String?) ?? '';
    _emailCtrl.text = (u['email'] as String?) ?? '';
    _phoneCtrl.text = (u['phoneNumber'] as String?) ?? '';
    _cityCtrl.text = (u['city'] as String?) ?? '';
    _districtCtrl.text = (u['district'] as String?) ?? '';
    _addressCtrl.text = (u['address'] as String?) ?? '';
    _bioCtrl.text = (u['workerBio'] as String?) ?? '';
    _gender = (u['gender'] as String?) ?? 'other';
    _currentIdentityUrl = u['identityPhotoUrl'] as String?;
    _identityVerified = u['identityVerified'] == true;
    final wc = u['workerCategories'];
    if (wc is List) {
      _workerCategories = wc.map((e) => e.toString()).toList();
    }
    _isWorker = _workerCategories.isNotEmpty;
    _isAvailable = u['isAvailable'] == true;
    final hMin = u['hourlyRateMin'];
    final hMax = u['hourlyRateMax'];
    if (hMin != null) _hourlyMinCtrl.text = hMin.toString();
    if (hMax != null) _hourlyMaxCtrl.text = hMax.toString();
    final bd = u['birthDate'] as String?;
    if (bd != null && bd.isNotEmpty) {
      try {
        _birthDate = DateTime.parse(bd);
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _cityCtrl.dispose();
    _districtCtrl.dispose();
    _addressCtrl.dispose();
    _bioCtrl.dispose();
    _hourlyMinCtrl.dispose();
    _hourlyMaxCtrl.dispose();
    super.dispose();
  }

  // ── Phase 72: Profile photo pick + upload ─────────────────────────────────
  Future<void> _pickAndUploadPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 80,
    );
    if (picked == null) return;
    setState(() => _busySection = 'photo');
    try {
      final url = await ref
          .read(photoRepositoryProvider)
          .uploadProfilePhoto(File(picked.path));
      // PATCH /users/me ile kalıcı olarak kaydet — _patch zaten authState + completion
      // refresh ediyor; setState 'photo' bitince UI yeni avatarı CircleAvatar'da gösterir.
      await _patch('photo', {'profileImageUrl': url});
    } catch (e) {
      _snack(e.toString(), error: true);
      if (mounted) setState(() => _busySection = null);
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────
  Future<void> _patch(String section, Map<String, dynamic> data) async {
    setState(() => _busySection = section);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
      final res = await dio.patch(
        '/users/me',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      await prefs.setString('user_data', jsonEncode(res.data));
      ref
          .read(authStateProvider.notifier)
          .updateUserData(Map<String, dynamic>.from(res.data as Map));
      ref.invalidate(profileCompletionProvider);
      if (mounted) _snack('Bilgiler güncellendi ✓');
    } on DioException catch (e) {
      _snack(e.response?.data?['message']?.toString() ?? 'Güncelleme başarısız',
          error: true);
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busySection = null);
    }
  }

  Future<void> _savePersonal() async {
    if (_nameCtrl.text.trim().isEmpty) {
      _snack('Ad soyad boş olamaz.', error: true);
      return;
    }
    final bdStr = _birthDate != null
        ? '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}'
        : null;
    await _patch('personal', {
      'fullName': _nameCtrl.text.trim(),
      'gender': _gender,
      if (bdStr != null) 'birthDate': bdStr,
    });
  }

  Future<void> _saveContact() async {
    await _patch('contact', {
      if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
      if (_phoneCtrl.text.trim().isNotEmpty)
        'phoneNumber': _phoneCtrl.text.trim(),
    });
  }

  Future<void> _saveAddress() async {
    await _patch('address', {
      if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
      if (_districtCtrl.text.trim().isNotEmpty)
        'district': _districtCtrl.text.trim(),
      if (_addressCtrl.text.trim().isNotEmpty)
        'address': _addressCtrl.text.trim(),
    });
  }

  Future<void> _saveWorker() async {
    final min = double.tryParse(_hourlyMinCtrl.text.trim().replaceAll(',', '.'));
    final max = double.tryParse(_hourlyMaxCtrl.text.trim().replaceAll(',', '.'));
    await _patch('worker', {
      if (_bioCtrl.text.trim().isNotEmpty) 'workerBio': _bioCtrl.text.trim(),
      if (min != null) 'hourlyRateMin': min,
      if (max != null) 'hourlyRateMax': max,
      'isAvailable': _isAvailable,
    });
  }

  Future<void> _pickIdentity() async {
    final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery, imageQuality: 80, maxWidth: 1280);
    if (picked == null) return;
    setState(() => _newIdentityPhoto = File(picked.path));
  }

  Future<void> _saveIdentity() async {
    if (_newIdentityPhoto == null) {
      _snack('Önce kimlik fotoğrafı seçin.', error: true);
      return;
    }
    setState(() => _busySection = 'identity');
    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      final url = await repo.uploadIdentityPhoto(_newIdentityPhoto!);
      _currentIdentityUrl = url;
      _newIdentityPhoto = null;
      await _patch('identity', {'identityPhotoUrl': url});
    } catch (e) {
      _snack(e.toString().replaceFirst('Exception: ', ''), error: true);
      if (mounted) setState(() => _busySection = null);
    }
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.success,
    ));
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final completion = ref.watch(profileCompletionProvider);
    final missing = completion.maybeWhen(
      data: (d) => ((d['missingFields'] as List?) ?? const [])
          .map((e) => e.toString())
          .toSet(),
      orElse: () => <String>{},
    );
    final percent = completion.maybeWhen(
      data: (d) => (d['percent'] as num?)?.toInt() ?? 0,
      orElse: () => 0,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          const SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            title: Text('Profilimi Düzenle'),
          ),
          SliverToBoxAdapter(
            child: _progressChip(percent, missing.length),
          ),
          SliverList(
            delegate: SliverChildListDelegate([
              _photoSection(missing),
              _personalSection(missing),
              _contactSection(missing),
              _addressSection(missing),
              if (_isWorker) _workerSection(missing),
              if (_isWorker) _insuranceSection(),
              _identitySection(missing),
              const SizedBox(height: 32),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _progressChip(int percent, int missingCount) {
    final color = percent >= 100
        ? AppColors.success
        : percent >= 50
            ? AppColors.primary
            : const Color(0xFFFFA000);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(children: [
          Icon(Icons.account_circle_outlined, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              percent >= 100
                  ? 'Profil tamamlandı ✓'
                  : 'Profilin %$percent tamamlandı'
                      '${missingCount > 0 ? ' • $missingCount eksik alan' : ''}',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '%$percent',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
        ]),
      ),
    );
  }

  // ── Section: Profile Photo ────────────────────────────────────────────────
  Widget _photoSection(Set<String> missing) {
    final auth = ref.watch(authStateProvider);
    final url = auth is AuthAuthenticated
        ? auth.user['profileImageUrl'] as String?
        : null;
    final isMissing = missing.contains('profileImageUrl');
    return _sectionCard(
      icon: '📷',
      title: 'Profil Fotoğrafı',
      isMissing: isMissing,
      missingFields: isMissing ? const ['profileImageUrl'] : const [],
      child: Row(children: [
        CircleAvatar(
          radius: 36,
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          backgroundImage: (url != null && url.isNotEmpty)
              ? NetworkImage(url.startsWith('http')
                  ? url
                  : '${ApiConstants.baseUrl}$url')
              : null,
          child: (url == null || url.isEmpty)
              ? const Icon(Icons.person, size: 36, color: AppColors.primary)
              : null,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Avatarını güncelle',
                  style:
                      TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 4),
              Text(
                isMissing
                    ? 'Henüz fotoğraf eklemedin'
                    : 'Profil fotoğrafı yüklü',
                style: TextStyle(
                  fontSize: 12,
                  color: isMissing ? AppColors.error : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _busySection == 'photo' ? null : _pickAndUploadPhoto,
                icon: _busySection == 'photo'
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.photo_camera, size: 16),
                label: Text(
                  _busySection == 'photo' ? 'Yükleniyor…' : 'Fotoğraf Seç',
                  style: const TextStyle(fontSize: 12),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                ),
              ),
            ],
          ),
        ),
      ]),
    );
  }

  // ── Section: Personal ─────────────────────────────────────────────────────
  Widget _personalSection(Set<String> missing) {
    final fields = ['fullName', 'birthDate', 'gender'];
    final missingHere = fields.where(missing.contains).toList();
    return _sectionCard(
      icon: '👤',
      title: 'Kişisel Bilgiler',
      isMissing: missingHere.isNotEmpty,
      missingFields: missingHere,
      busy: _busySection == 'personal',
      onSave: _savePersonal,
      child: Column(children: [
        _field(_nameCtrl, 'Ad Soyad *', Icons.person_outline,
            TextInputType.name,
            highlight: missing.contains('fullName')),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () async {
            final d = await showDatePicker(
              context: context,
              initialDate: _birthDate ?? DateTime(1990),
              firstDate: DateTime(1920),
              lastDate:
                  DateTime.now().subtract(const Duration(days: 365 * 16)),
            );
            if (d != null) setState(() => _birthDate = d);
          },
          child: _infoTile(
            Icons.cake_outlined,
            _birthDate != null
                ? '${_birthDate!.day}.${_birthDate!.month}.${_birthDate!.year}'
                : 'Doğum Tarihi',
            hint: _birthDate == null,
            highlight: missing.contains('birthDate'),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: _boxDeco(highlight: missing.contains('gender')),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _gender,
              isExpanded: true,
              icon: const Icon(Icons.arrow_drop_down),
              items: const [
                DropdownMenuItem(value: 'male', child: Text('Erkek')),
                DropdownMenuItem(value: 'female', child: Text('Kadın')),
                DropdownMenuItem(
                    value: 'other', child: Text('Belirtmek istemiyorum')),
              ],
              onChanged: (v) => setState(() => _gender = v ?? 'other'),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _contactSection(Set<String> missing) {
    final fields = ['phoneNumber', 'email'];
    final missingHere = fields.where(missing.contains).toList();
    return _sectionCard(
      icon: '📞',
      title: 'İletişim',
      isMissing: missingHere.isNotEmpty,
      missingFields: missingHere,
      busy: _busySection == 'contact',
      onSave: _saveContact,
      child: Column(children: [
        _field(_phoneCtrl, 'Telefon', Icons.phone_outlined,
            TextInputType.phone,
            highlight: missing.contains('phoneNumber')),
        const SizedBox(height: 12),
        _field(_emailCtrl, 'E-posta', Icons.email_outlined,
            TextInputType.emailAddress,
            highlight: missing.contains('email')),
      ]),
    );
  }

  Widget _addressSection(Set<String> missing) {
    final fields = ['city', 'district', 'address'];
    final missingHere = fields.where(missing.contains).toList();
    return _sectionCard(
      icon: '📍',
      title: 'Adres',
      isMissing: missingHere.isNotEmpty,
      missingFields: missingHere,
      busy: _busySection == 'address',
      onSave: _saveAddress,
      child: Column(children: [
        _field(_cityCtrl, 'Şehir', Icons.location_city_outlined,
            TextInputType.text,
            highlight: missing.contains('city')),
        const SizedBox(height: 12),
        _field(_districtCtrl, 'İlçe', Icons.map_outlined, TextInputType.text,
            highlight: missing.contains('district')),
        const SizedBox(height: 12),
        TextField(
          controller: _addressCtrl,
          maxLines: 3,
          decoration: _inputDeco(
            'Açık Adres',
            Icons.home_outlined,
            highlight: missing.contains('address'),
          ),
        ),
      ]),
    );
  }

  Widget _workerSection(Set<String> missing) {
    final fields = [
      'workerCategories',
      'workerBio',
      'hourlyRateMin',
      'hourlyRateMax',
      'isAvailable',
    ];
    final missingHere = fields.where(missing.contains).toList();
    return _sectionCard(
      icon: '🛠️',
      title: 'Usta Bilgileri',
      isMissing: missingHere.isNotEmpty,
      missingFields: missingHere,
      busy: _busySection == 'worker',
      onSave: _saveWorker,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (_workerCategories.isNotEmpty)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _workerCategories
                .map((c) => Chip(
                      label: Text(c, style: const TextStyle(fontSize: 12)),
                      backgroundColor:
                          AppColors.primary.withValues(alpha: 0.10),
                      side: BorderSide(
                          color: AppColors.primary.withValues(alpha: 0.3)),
                    ))
                .toList(),
          )
        else
          Text(
            'Hizmet kategorisi seçilmedi',
            style: TextStyle(
              fontSize: 12,
              color: missing.contains('workerCategories')
                  ? AppColors.error
                  : AppColors.textSecondary,
            ),
          ),
        const SizedBox(height: 12),
        TextField(
          controller: _bioCtrl,
          maxLines: 4,
          maxLength: 300,
          decoration: _inputDeco(
            'Hakkında (workerBio)',
            Icons.work_outline,
            highlight: missing.contains('workerBio'),
          ),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: _field(_hourlyMinCtrl, 'Saatlik Min (₺)',
                Icons.attach_money_outlined, TextInputType.number,
                highlight: missing.contains('hourlyRateMin')),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _field(_hourlyMaxCtrl, 'Saatlik Max (₺)',
                Icons.attach_money_outlined, TextInputType.number,
                highlight: missing.contains('hourlyRateMax')),
          ),
        ]),
        const SizedBox(height: 12),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('İş alıyorum (müsaitlik)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          subtitle: const Text(
            'Açıkken arama sonuçlarında öne çıkarsın',
            style: TextStyle(fontSize: 11),
          ),
          value: _isAvailable,
          activeThumbColor: AppColors.success,
          onChanged: (v) => setState(() => _isAvailable = v),
        ),
      ]),
    );
  }

  Widget _identitySection(Set<String> missing) {
    final fields = ['identityPhotoUrl', 'identityVerified'];
    final missingHere = fields.where(missing.contains).toList();
    final hasUrl = _currentIdentityUrl != null;
    final hasFile = _newIdentityPhoto != null;
    return _sectionCard(
      icon: '🪪',
      title: 'Kimlik Doğrulama',
      isMissing: missingHere.isNotEmpty,
      missingFields: missingHere,
      busy: _busySection == 'identity',
      saveLabel: hasFile ? 'Yükle' : null,
      onSave: hasFile ? _saveIdentity : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (_identityVerified)
          _statusPill('Onaylandı', Colors.green, Icons.verified)
        else if (hasUrl)
          _statusPill('İnceleniyor', Colors.orange, Icons.hourglass_top)
        else
          _statusPill('Doğrulanmadı', AppColors.error, Icons.warning_amber),
        const SizedBox(height: 12),
        if (hasFile)
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.file(_newIdentityPhoto!,
                height: 140, width: double.infinity, fit: BoxFit.cover),
          )
        else if (hasUrl)
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              _currentIdentityUrl!.startsWith('http')
                  ? _currentIdentityUrl!
                  : '${ApiConstants.baseUrl}$_currentIdentityUrl',
              height: 140,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                  height: 140,
                  color: Colors.grey.shade100,
                  child: const Icon(Icons.broken_image_outlined,
                      color: AppColors.textHint, size: 40)),
            ),
          ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _pickIdentity,
          icon: Icon(
              hasUrl || hasFile
                  ? Icons.refresh_outlined
                  : Icons.add_photo_alternate_outlined,
              size: 16),
          label: Text(hasUrl || hasFile ? 'Değiştir' : 'Fotoğraf Seç',
              style: const TextStyle(fontSize: 13)),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ]),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  Widget _sectionCard({
    required String icon,
    required String title,
    required bool isMissing,
    required List<String> missingFields,
    required Widget child,
    bool busy = false,
    VoidCallback? onSave,
    String? saveLabel,
  }) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isMissing
              ? AppColors.error.withValues(alpha: 0.3)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 6),
          child: Row(children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.secondary),
              ),
            ),
            _badge(isMissing
                ? '✏️  ${missingFields.length} eksik'
                : '✓ Eksiksiz',
                isMissing ? AppColors.error : AppColors.success),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: child,
        ),
        if (onSave != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: busy ? null : onSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Text(saveLabel ?? 'Bu Bölümü Kaydet',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ),
      ]),
    );
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Text(text,
            style: TextStyle(
                fontSize: 11, color: color, fontWeight: FontWeight.w700)),
      );

  Widget _statusPill(String text, Color color, IconData icon) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(text,
              style: TextStyle(
                  fontSize: 12, color: color, fontWeight: FontWeight.w700)),
        ]),
      );

  InputDecoration _inputDeco(String label, IconData icon,
      {bool highlight = false}) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(
          color:
              highlight ? AppColors.error.withValues(alpha: 0.5) : Colors.grey.shade200),
    );
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      suffixIcon: highlight
          ? const Icon(Icons.priority_high, color: AppColors.error, size: 18)
          : null,
      alignLabelWithHint: true,
      filled: true,
      fillColor: Colors.white,
      border: border,
      enabledBorder: border,
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      TextInputType kb,
      {bool highlight = false}) {
    return TextField(
      controller: ctrl,
      keyboardType: kb,
      textCapitalization: kb == TextInputType.name
          ? TextCapitalization.words
          : TextCapitalization.none,
      decoration: _inputDeco(label, icon, highlight: highlight),
    );
  }

  Widget _infoTile(IconData icon, String text,
          {bool hint = false, bool highlight = false}) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: _boxDeco(highlight: highlight),
        child: Row(children: [
          Icon(icon, color: hint ? AppColors.textHint : AppColors.textPrimary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text,
                style: TextStyle(
                    fontSize: 15,
                    color:
                        hint ? AppColors.textHint : AppColors.textPrimary)),
          ),
          if (highlight)
            const Icon(Icons.priority_high,
                color: AppColors.error, size: 18),
        ]),
      );

  Widget _insuranceSection() => _InsuranceSection(repo: ref.read(insuranceRepositoryProvider));

  BoxDecoration _boxDeco({bool highlight = false}) => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: highlight
                ? AppColors.error.withValues(alpha: 0.5)
                : Colors.grey.shade200),
      );
}

// Phase 119 — Worker insurance edit section
class _InsuranceSection extends StatefulWidget {
  final InsuranceRepository repo;
  const _InsuranceSection({required this.repo});

  @override
  State<_InsuranceSection> createState() => _InsuranceSectionState();
}

class _InsuranceSectionState extends State<_InsuranceSection> {
  final _policyCtrl = TextEditingController();
  final _providerCtrl = TextEditingController();
  final _coverageCtrl = TextEditingController();
  DateTime? _expiry;
  bool _loading = true;
  bool _saving = false;
  bool _verified = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final ins = await widget.repo.getMine();
    if (!mounted) return;
    setState(() {
      if (ins != null) {
        _policyCtrl.text = ins.policyNumber;
        _providerCtrl.text = ins.provider;
        _coverageCtrl.text = ins.coverageAmount.toStringAsFixed(0);
        _expiry = ins.expiresAt;
        _verified = ins.verified;
      }
      _loading = false;
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiry ?? now.add(const Duration(days: 365)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 10)),
    );
    if (picked != null) setState(() => _expiry = picked);
  }

  Future<void> _save() async {
    final policy = _policyCtrl.text.trim();
    final provider = _providerCtrl.text.trim();
    final coverage = double.tryParse(_coverageCtrl.text.trim()) ?? 0;
    if (policy.isEmpty || provider.isEmpty || coverage <= 0 || _expiry == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tüm alanları doldurun')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final ins = await widget.repo.upsert(
        policyNumber: policy,
        provider: provider,
        coverageAmount: coverage,
        expiresAt: _expiry!,
      );
      if (!mounted) return;
      setState(() => _verified = ins.verified);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sigorta bilgisi kaydedildi (admin onayı bekleniyor)')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Text('🛡️', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              const Text('Mesleki Sorumluluk Sigortası',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const Spacer(),
              if (_verified)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('Onaylı',
                      style: TextStyle(color: AppColors.success, fontSize: 12)),
                ),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: _policyCtrl,
              decoration: const InputDecoration(labelText: 'Poliçe Numarası'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _providerCtrl,
              decoration: const InputDecoration(labelText: 'Sigorta Şirketi'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _coverageCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: 'Teminat Tutarı (₺)'),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Bitiş Tarihi'),
                child: Text(_expiry != null
                    ? '${_expiry!.day}.${_expiry!.month}.${_expiry!.year}'
                    : 'Tarih seçin'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Kaydediliyor...' : 'Kaydet'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
