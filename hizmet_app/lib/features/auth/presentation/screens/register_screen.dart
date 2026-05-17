import 'dart:io' as io;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../providers/auth_provider.dart';
import '../../../service_requests/data/service_request_repository.dart';
import '../../../../l10n/app_localizations.dart';

class RegisterScreen extends ConsumerWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.registerTitle,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              Text(l.registerSubtitle,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 16)),
              const SizedBox(height: 28),
              const _RegisterForm(),
            ],
          ),
        ),
      ),
    );
  }
}

class _RegisterForm extends ConsumerStatefulWidget {
  const _RegisterForm();
  @override
  ConsumerState<_RegisterForm> createState() => _RegisterFormState();
}

class _RegisterFormState extends ConsumerState<_RegisterForm> {
  // AdÄ±m 1: Temel bilgiler
  final _nameCtrl     = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  // AdÄ±m 1: KiÅŸisel bilgiler
  final _cityCtrl     = TextEditingController();
  final _districtCtrl = TextEditingController();
  final _addressCtrl  = TextEditingController();

  bool   _obscurePass   = true;
  String _gender        = 'other';
  DateTime? _birthDate;
  // Phase 129 â€” Worker onboarding routing flag.
  bool   _registerAsWorker = false;

  // AdÄ±m 2: Kimlik fotoÄŸrafÄ±
  XFile?  _identityPhoto;
  XFile?  _documentPhoto;

  int    _step     = 0; // 0 = form, 1 = kimlik yÃ¼kleme
  bool   _loading  = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _passCtrl.dispose(); _cityCtrl.dispose(); _districtCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitStep1() async {
    final name  = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final pass  = _passCtrl.text;
    if (name.isEmpty || phone.isEmpty || pass.isEmpty) {
      setState(() => _error = AppLocalizations.of(context).registerRequiredFields);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authStateProvider.notifier).register(
        fullName:    name,
        phoneNumber: phone,
        password:    pass,
        email:       _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        birthDate:   _birthDate != null
            ? '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2,'0')}-${_birthDate!.day.toString().padLeft(2,'0')}'
            : null,
        gender:      _gender,
        city:        _cityCtrl.text.trim(),
        district:    _districtCtrl.text.trim(),
        address:     _addressCtrl.text.trim(),
      );
      // Phase 250-C — Kayıt başarılı; telefonu SMS OTP ile doğrula, sonra step2.
      if (!mounted) return;
      final verifiedPhone = await context.push<String?>(
        '/auth/sms-verify?phone=${Uri.encodeQueryComponent(phone)}',
      );
      // Phase 252-D — Strict block: SMS doğrulama tamamlanmadan step 2'ye
      // geçilemez. Kullanıcı verify ekranını geri tuşu ile kapattıysa
      // (verifiedPhone == null/empty) kayıt akışı iptal: oturumu kapat,
      // login ekranına yönlendir. Backend'de orphan user kalır; kullanıcı
      // sonradan login + verify ile düzeltebilir.
      if (verifiedPhone == null || verifiedPhone.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Telefon doğrulanmadan kayıt tamamlanamaz. Profilden tekrar deneyebilirsin.',
            ),
          ),
        );
        await ref.read(authStateProvider.notifier).logout();
        if (!mounted) return;
        context.go('/giris-yap');
        return;
      }
      ref.read(authStateProvider.notifier).updateUserData({
        'phoneNumber': verifiedPhone,
        'isPhoneVerified': true,
      });
      if (!mounted) return;
      setState(() { _step = 1; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  Future<void> _pickIdentity() async {
    final p = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1280);
    if (p != null) setState(() => _identityPhoto = p);
  }

  Future<void> _pickDocument() async {
    final p = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1280);
    if (p != null) setState(() => _documentPhoto = p);
  }

  Future<void> _submitStep2() async {
    if (_identityPhoto == null) {
      setState(() => _error = 'Kimlik fotoÄŸrafÄ± zorunludur.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      final idUrl = await repo.uploadIdentityPhoto(_identityPhoto!);
      String? docUrl;
      if (_documentPhoto != null) {
        docUrl = await repo.uploadDocument(_documentPhoto!);
      }
      // KullanÄ±cÄ± datasÄ±nÄ± gÃ¼ncelle
      ref.read(authStateProvider.notifier).updateUserData({
        'identityPhotoUrl': idUrl,
        if (docUrl != null) 'documentPhotoUrl': docUrl,
      });
      if (mounted) {
        // Phase 129 â€” Worker registration â†’ wizard. Customer â†’ main shell.
        if (_registerAsWorker) {
          context.go('/usta-baslangic');
        } else {
          ref.read(selectedTabProvider.notifier).state = 0;
          context.go('/');
        }
      }
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  Future<void> _skipStep2() async {
    if (mounted) {
      // Phase 129 â€” Worker'lar identity skip etse de wizard'a yÃ¶nlendirilir.
      if (_registerAsWorker) {
        context.go('/usta-baslangic');
      } else {
        ref.read(selectedTabProvider.notifier).state = 0;
        context.go('/');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return _step == 0 ? _buildStep1() : _buildStep2();
  }

  Widget _buildStep1() {
    final l = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _field(_nameCtrl, l.registerFullName, Icons.person_outline, TextInputType.name,
            TextCapitalization.words),
        const SizedBox(height: 14),
        _field(_emailCtrl, l.registerEmailOptional, Icons.email_outlined,
            TextInputType.emailAddress, TextCapitalization.none),
        const SizedBox(height: 14),
        _field(_phoneCtrl, l.registerPhone, Icons.phone_outlined,
            TextInputType.phone, TextCapitalization.none),
        const SizedBox(height: 14),
        TextField(
          controller: _passCtrl,
          obscureText: _obscurePass,
          decoration: InputDecoration(
            labelText: l.registerPassword,
            prefixIcon: const Icon(Icons.lock_outline),
            
            suffixIcon: IconButton(
              icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscurePass = !_obscurePass),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Divider(),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(l.registerPersonalInfo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
        ),

        // DoÄŸum tarihi
        GestureDetector(
          onTap: () async {
            final d = await showDatePicker(
              context: context,
              initialDate: DateTime(1990),
              firstDate: DateTime(1920),
              lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
            );
            if (d != null) setState(() => _birthDate = d);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border)),
            child: Row(children: [
              const Icon(Icons.cake_outlined, color: AppColors.textHint),
              const SizedBox(width: 12),
              Text(
                _birthDate != null
                    ? '${_birthDate!.day}.${_birthDate!.month}.${_birthDate!.year}'
                    : l.registerBirthDateOptional,
                style: TextStyle(color: _birthDate != null ? AppColors.textPrimary : AppColors.textHint, fontSize: 16),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 14),

        // Cinsiyet
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _gender,
              isExpanded: true,
              icon: const Icon(Icons.arrow_drop_down),
              items: const [
                DropdownMenuItem(value: 'male',   child: Text('Erkek')),
                DropdownMenuItem(value: 'female', child: Text('KadÄ±n')),
                DropdownMenuItem(value: 'other',  child: Text('Belirtmek istemiyorum')),
              ],
              onChanged: (v) => setState(() => _gender = v ?? 'other'),
            ),
          ),
        ),
        const SizedBox(height: 14),

        _field(_cityCtrl, l.registerCityOptional, Icons.location_city_outlined,
            TextInputType.text, TextCapitalization.words),
        const SizedBox(height: 14),
        _field(_districtCtrl, l.registerDistrictOptional, Icons.map_outlined,
            TextInputType.text, TextCapitalization.words),
        const SizedBox(height: 14),
        TextField(
          controller: _addressCtrl,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: l.registerAddressOptional,
            prefixIcon: const Icon(Icons.home_outlined),
            alignLabelWithHint: true,
            
          ),
        ),

        const SizedBox(height: 16),
        // Phase 129 â€” Usta olarak kayÄ±t ol toggle.
        Container(
          decoration: BoxDecoration(
            color: _registerAsWorker
                ? AppColors.primaryLight
                : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _registerAsWorker
                  ? AppColors.primary
                  : AppColors.border,
            ),
          ),
          child: SwitchListTile(
            value: _registerAsWorker,
            onChanged: (v) => setState(() => _registerAsWorker = v),
            activeThumbColor: AppColors.primary,
            title: const Text('Usta olarak kayÄ±t ol',
                style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text(
              'Hizmet verirsen kayÄ±t sonrasÄ± kÄ±sa bir kurulum yapacaÄŸÄ±z.',
              style: TextStyle(fontSize: 12),
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _errorBox(_error!),
        ],
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _loading ? null : _submitStep1,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _loading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(l.registerContinue, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primaryLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: const Row(children: [
            Icon(Icons.verified_user_outlined, color: AppColors.primary),
            SizedBox(width: 12),
            Expanded(child: Text(
              'Kimlik doÄŸrulama iÃ§in kimlik fotoÄŸrafÄ±nÄ±zÄ± yÃ¼kleyin. GÃ¶rseller ÅŸifreli olarak saklanÄ±r.',
              style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
            )),
          ]),
        ),
        const SizedBox(height: 24),

        // Kimlik fotoÄŸrafÄ± (zorunlu)
        const Text('Kimlik FotoÄŸrafÄ± *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(height: 8),
        _photoPickerTile(
          label: 'Kimlik / NÃ¼fus CÃ¼zdanÄ±',
          icon: Icons.badge_outlined,
          file: _identityPhoto,
          onTap: _pickIdentity,
          required: true,
        ),
        const SizedBox(height: 16),

        // Belge
        Row(children: [
          const Text('Yeterlilik Belgesi', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.amber.shade300),
            ),
            child: Text('Ã–nerilen', style: TextStyle(fontSize: 10, color: Colors.amber.shade800, fontWeight: FontWeight.bold)),
          ),
        ]),
        const SizedBox(height: 4),
        Text(
          'Sertifika / diploma eklemek profilinizde "BelgelenmiÅŸ Uzman" rozeti kazandÄ±rÄ±r '
          've daha fazla teklif almanÄ±zÄ± saÄŸlar.',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 8),
        _photoPickerTile(
          label: 'Belge / Sertifika / Diploma',
          icon: Icons.workspace_premium_outlined,
          file: _documentPhoto,
          onTap: _pickDocument,
          required: false,
        ),
        if (_documentPhoto == null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(children: [
              Icon(Icons.info_outline, size: 15, color: Colors.amber.shade700),
              const SizedBox(width: 8),
              Expanded(child: Text(
                'Belge yÃ¼klenmedi. Profil ayarlarÄ±ndan daha sonra ekleyebilirsiniz.',
                style: TextStyle(fontSize: 11, color: Colors.amber.shade800),
              )),
            ]),
          ),
        ],

        if (_error != null) ...[
          const SizedBox(height: 12),
          _errorBox(_error!),
        ],
        const SizedBox(height: 24),

        ElevatedButton(
          onPressed: _loading ? null : _submitStep2,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _loading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('YÃ¼kle ve Tamamla', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: _loading ? null : _skipStep2,
          child: const Text('Åimdi DeÄŸil, Atla', style: TextStyle(color: AppColors.textSecondary)),
        ),
      ],
    );
  }

  Widget _photoPickerTile({required String label, required IconData icon, required XFile? file, required VoidCallback onTap, required bool required}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 110,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: file != null ? AppColors.primary : (required ? Colors.orange.shade300 : AppColors.border),
            width: file != null ? 1.5 : 1,
          ),
        ),
        child: file != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: kIsWeb
                    ? Image.network(file!.path, fit: BoxFit.cover, width: double.infinity)
                    : Image.file(io.File(file!.path), fit: BoxFit.cover, width: double.infinity))
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 36, color: AppColors.textHint),
                  const SizedBox(height: 8),
                  Text(label, style: const TextStyle(color: AppColors.textHint, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(required ? 'Zorunlu' : 'Opsiyonel',
                      style: TextStyle(fontSize: 11, color: required ? Colors.orange.shade600 : AppColors.textHint)),
                ],
              ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      TextInputType keyboard, TextCapitalization cap) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboard,
      textCapitalization: cap,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        
      ),
    );
  }

  Widget _errorBox(String msg) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.red.shade200)),
    child: Text(msg, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
  );
}
