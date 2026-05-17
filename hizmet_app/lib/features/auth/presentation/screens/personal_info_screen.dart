import 'dart:convert';
import 'dart:io' as io;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';
import '../../../profile/data/user_profile_repository.dart';
import '../../../service_requests/data/service_request_repository.dart';

class PersonalInfoScreen extends ConsumerStatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  ConsumerState<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends ConsumerState<PersonalInfoScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  // â”€â”€ Temel Bilgiler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _districtCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  String _gender = 'other';
  DateTime? _birthDate;

  // â”€â”€ Belgeler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  XFile? _newIdentityPhoto;
  XFile? _newDocumentPhoto;
  String? _currentIdentityUrl;
  String? _currentDocumentUrl;
  bool _identityVerified = false;

  bool _loading = false;
  bool _docLoading = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _prefill();
  }

  void _prefill() {
    final auth = ref.read(authStateProvider);
    if (auth is! AuthAuthenticated) return;
    final u = auth.user;
    _nameCtrl.text = u['fullName'] as String? ?? '';
    _emailCtrl.text = u['email'] as String? ?? '';
    _phoneCtrl.text = u['phoneNumber'] as String? ?? '';
    _cityCtrl.text = u['city'] as String? ?? '';
    _districtCtrl.text = u['district'] as String? ?? '';
    _addressCtrl.text = u['address'] as String? ?? '';
    _bioCtrl.text = u['workerBio'] as String? ?? '';
    _gender = u['gender'] as String? ?? 'other';
    _currentIdentityUrl = u['identityPhotoUrl'] as String?;
    _currentDocumentUrl = u['documentPhotoUrl'] as String?;
    _identityVerified = u['identityVerified'] == true;
    final bd = u['birthDate'] as String?;
    if (bd != null && bd.isNotEmpty) {
      try {
        _birthDate = DateTime.parse(bd);
      } catch (e, st) {
        debugPrint('personal_info_screen.parseBirthDate: $e\n$st');
      }
    }
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    _districtCtrl.dispose();
    _addressCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  // â”€â”€ Temel bilgileri kaydet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Future<void> _saveBasic() async {
    if (_nameCtrl.text.trim().isEmpty) {
      _snack('Ad soyad boş olamaz.', error: true);
      return;
    }
    setState(() => _loading = true);
    try {
      final bdStr = _birthDate != null
          ? '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}'
          : null;
      final updated =
          await ref.read(userProfileRepositoryProvider).patchMe({
        'fullName': _nameCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        if (_phoneCtrl.text.trim().isNotEmpty)
          'phoneNumber': _phoneCtrl.text.trim(),
        if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
        if (_districtCtrl.text.trim().isNotEmpty)
          'district': _districtCtrl.text.trim(),
        if (_addressCtrl.text.trim().isNotEmpty)
          'address': _addressCtrl.text.trim(),
        if (_bioCtrl.text.trim().isNotEmpty) 'workerBio': _bioCtrl.text.trim(),
        'gender': _gender,
        if (bdStr != null) 'birthDate': bdStr,
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(updated));
      ref.read(authStateProvider.notifier).updateUserData(updated);
      if (mounted) _snack('Bilgiler güncellendi âœ“');
    } on DioException catch (e) {
      _snack(e.response?.data?['message'] ?? 'Güncelleme başarısız',
          error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // â”€â”€ Belge yükle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Future<void> _pickAndUpload({required bool isIdentity}) async {
    final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery, imageQuality: 80, maxWidth: 1280);
    if (picked == null) return;
    setState(() {
      if (isIdentity) {
        _newIdentityPhoto = picked;
      } else {
        _newDocumentPhoto = picked;
      }
    });
  }

  Future<void> _saveDocuments() async {
    if (_newIdentityPhoto == null && _newDocumentPhoto == null) {
      _snack('Yüklenecek yeni belge seçilmedi.', error: true);
      return;
    }
    setState(() => _docLoading = true);
    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      String? idUrl;
      String? docUrl;

      if (_newIdentityPhoto != null) {
        idUrl = await repo.uploadIdentityPhoto(_newIdentityPhoto!);
        setState(() {
          _currentIdentityUrl = idUrl;
          _newIdentityPhoto = null;
        });
      }
      if (_newDocumentPhoto != null) {
        docUrl = await repo.uploadDocument(_newDocumentPhoto!);
        setState(() {
          _currentDocumentUrl = docUrl;
          _newDocumentPhoto = null;
        });
      }

      // Kullanıcı profilini güncelle
      final updated = await ref.read(userProfileRepositoryProvider).patchMe({
        if (idUrl != null) 'identityPhotoUrl': idUrl,
        if (docUrl != null) 'documentPhotoUrl': docUrl,
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(updated));
      ref.read(authStateProvider.notifier).updateUserData(updated);
      if (mounted) _snack('Belgeler yüklendi âœ“');
    } catch (e) {
      _snack(e.toString().replaceFirst('Exception: ', ''), error: true);
    } finally {
      if (mounted) setState(() => _docLoading = false);
    }
  }

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : AppColors.success,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kişisel Bilgiler'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.person_outline, size: 18), text: 'Bilgilerim'),
            Tab(icon: Icon(Icons.badge_outlined, size: 18), text: 'Belgelerim'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildBasicTab(),
          _buildDocumentsTab(),
        ],
      ),
    );
  }

  // â”€â”€ Tab 1: Temel Bilgiler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Widget _buildBasicTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _section('İletişim Bilgileri'),
          _field(_nameCtrl, 'Ad Soyad *', Icons.person_outline,
              TextInputType.name),
          const SizedBox(height: 12),
          _field(_emailCtrl, 'E-posta', Icons.email_outlined,
              TextInputType.emailAddress),
          const SizedBox(height: 12),
          _field(
              _phoneCtrl, 'Telefon', Icons.phone_outlined, TextInputType.phone),

          const SizedBox(height: 20),
          _section('Kişisel Bilgiler'),

          // Doğum tarihi
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
            ),
          ),
          const SizedBox(height: 12),

          // Cinsiyet
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: _boxDeco(),
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

          const SizedBox(height: 20),
          _section('Konum Bilgileri'),
          _field(_cityCtrl, 'Şehir', Icons.location_city_outlined,
              TextInputType.text),
          const SizedBox(height: 12),
          _field(_districtCtrl, 'İlçe', Icons.map_outlined, TextInputType.text),
          const SizedBox(height: 12),
          TextField(
            controller: _addressCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Açık Adres',
              prefixIcon: const Icon(Icons.home_outlined),
              alignLabelWithHint: true,
              
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200)),
            ),
          ),

          const SizedBox(height: 20),
          _section('Usta Profili (opsiyonel)'),
          TextField(
            controller: _bioCtrl,
            maxLines: 4,
            maxLength: 300,
            decoration: InputDecoration(
              labelText: 'Kendinizi tanıtın (workerBio)',
              hintText: 'Uzmanlık alanınız, deneyiminiz...',
              prefixIcon: const Icon(Icons.work_outline),
              alignLabelWithHint: true,
              
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200)),
            ),
          ),

          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _saveBasic,
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
                  : const Text('Kaydet',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // â”€â”€ Tab 2: Belgeler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Widget _buildDocumentsTab() {
    final hasIdentity =
        _currentIdentityUrl != null || _newIdentityPhoto != null;
    final hasDocument =
        _currentDocumentUrl != null || _newDocumentPhoto != null;
    final hasNewUploads =
        _newIdentityPhoto != null || _newDocumentPhoto != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Kimlik durumu banner
          _buildDocStatusBanner(),
          const SizedBox(height: 20),

          _section('Kimlik Fotoğrafı'),
          _docCard(
            title: 'Kimlik / Nüfus Cüzdanı',
            subtitle: 'Ön yüz veya kimlik kartı',
            icon: Icons.badge_outlined,
            currentUrl: _currentIdentityUrl,
            newFile: _newIdentityPhoto,
            isVerified: _identityVerified,
            required: true,
            onPick: () => _pickAndUpload(isIdentity: true),
            onRemoveNew: () => setState(() => _newIdentityPhoto = null),
          ),

          const SizedBox(height: 20),
          _section('Yeterlilik Belgesi'),
          if (!hasDocument)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.orange.shade300),
              ),
              child: Row(children: [
                Icon(Icons.info_outline,
                    size: 18, color: Colors.orange.shade700),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(
                  'Yeterlilik belgesi eklemek profilinizde "Belgelenmiş Uzman" rozeti kazandırır.',
                  style: TextStyle(fontSize: 12, color: Colors.orange.shade800),
                )),
              ]),
            ),
          _docCard(
            title: 'Sertifika / Diploma / Yeterlilik',
            subtitle: 'Uzmanlık alanınıza ait belge',
            icon: Icons.description_outlined,
            currentUrl: _currentDocumentUrl,
            newFile: _newDocumentPhoto,
            isVerified: false,
            required: false,
            onPick: () => _pickAndUpload(isIdentity: false),
            onRemoveNew: () => setState(() => _newDocumentPhoto = null),
          ),

          if (hasNewUploads) ...[
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _docLoading ? null : _saveDocuments,
                icon: const Icon(Icons.cloud_upload_outlined),
                label: const Text('Belgeleri Yükle',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],

          if (!hasIdentity || !hasDocument) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.lock_outlined,
                        size: 16, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    Text('Güvenlik Notu',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700)),
                  ]),
                  const SizedBox(height: 6),
                  Text(
                    'Belgeleriniz şifreli olarak saklanır ve yalnızca doğrulama amacıyla incelenir. '
                    'Üçüncü taraflarla paylaşılmaz.',
                    style: TextStyle(
                        fontSize: 12, color: Colors.blue.shade700, height: 1.5),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildDocStatusBanner() {
    if (_identityVerified) {
      return _statusBanner(Icons.verified_user, 'Kimlik Doğrulandı',
          'Hesabınız onaylıdır. Mavi tik aktif.', Colors.green);
    }
    if (_currentIdentityUrl != null) {
      return _statusBanner(Icons.hourglass_empty, 'Kimlik İnceleniyor',
          'Doğrulama süreci devam ediyor.', Colors.orange);
    }
    return _statusBanner(Icons.warning_amber_outlined, 'Kimlik Yüklenmedi',
        'Güven için kimlik fotoğrafı yükleyin.', Colors.red);
  }

  Widget _statusBanner(IconData icon, String title, String sub, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: TextStyle(
                  fontWeight: FontWeight.bold, color: color, fontSize: 14)),
          Text(sub,
              style:
                  TextStyle(fontSize: 12, color: color.withValues(alpha: 0.8))),
        ])),
      ]),
    );
  }

  Widget _docCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required String? currentUrl,
    required XFile? newFile,
    required bool isVerified,
    required bool required,
    required VoidCallback onPick,
    required VoidCallback onRemoveNew,
  }) {
    final hasFile = newFile != null;
    final hasUrl = currentUrl != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasFile
              ? AppColors.primary
              : hasUrl
                  ? Colors.green.shade400
                  : required
                      ? Colors.orange.shade300
                      : AppColors.border,
          width: (hasFile || hasUrl) ? 1.5 : 1,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: hasUrl || hasFile
                        ? Colors.green.shade50
                        : AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon,
                      size: 22,
                      color: hasUrl || hasFile
                          ? Colors.green.shade600
                          : AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                            child: Text(title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: AppColors.textPrimary)),
                          ),
                          if (isVerified)
                            const Icon(Icons.verified,
                                color: Colors.blue, size: 18),
                        ]),
                        Text(subtitle,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        if (hasFile)
                          _badge('Yüklemeye Hazır', Colors.blue)
                        else if (hasUrl && isVerified)
                          _badge('Onaylandı âœ“', Colors.green)
                        else if (hasUrl)
                          _badge('Yüklendi â€“ İnceleniyor', Colors.orange)
                        else
                          _badge(required ? 'Zorunlu' : 'Opsiyonel',
                              required ? Colors.orange : Colors.grey),
                      ]),
                ),
              ],
            ),
          ),

          // Önizleme
          if (hasFile || hasUrl) ...[
            Container(
              height: 160,
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(13),
                    bottomRight: Radius.circular(13)),
              ),
              clipBehavior: Clip.antiAlias,
              child: hasFile
                  ? (kIsWeb
                      ? Image.network(newFile!.path,
                          fit: BoxFit.cover, width: double.infinity)
                      : Image.file(io.File(newFile!.path),
                          fit: BoxFit.cover, width: double.infinity))
                  : Image.network(currentUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey.shade100,
                            child: const Icon(Icons.broken_image_outlined,
                                color: AppColors.textHint, size: 40),
                          )),
            ),
          ],

          // Aksiyon
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onPick,
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
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                if (hasFile) ...[
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: onRemoveNew,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(
                          vertical: 10, horizontal: 14),
                    ),
                    child: const Text('İptal', style: TextStyle(fontSize: 13)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(text,
            style: TextStyle(
                fontSize: 11, color: color, fontWeight: FontWeight.w600)),
      );

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.primary)),
      );

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      TextInputType kb) {
    return TextField(
      controller: ctrl,
      keyboardType: kb,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade200)),
      ),
    );
  }

  Widget _infoTile(IconData icon, String text, {bool hint = false}) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: _boxDeco(),
        child: Row(children: [
          Icon(icon, color: hint ? AppColors.textHint : AppColors.textPrimary),
          const SizedBox(width: 12),
          Text(text,
              style: TextStyle(
                  fontSize: 16,
                  color: hint ? AppColors.textHint : AppColors.textPrimary)),
        ]),
      );

  BoxDecoration _boxDeco() => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      );
}
