import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/firebase_auth_repository.dart';

/// Phase 250-B — SMS OTP doğrulama ekranı.
///
/// Backend:
///   POST /auth/sms/request {phoneNumber}  → kod gönder (Phase 170: 10/dk)
///   POST /auth/sms/verify  {phoneNumber, code} → doğrula (6 hane, 5dk expiry)
///
/// Hata yönetimi [FirebaseAuthRepository] içinde Türkçe'ye map edilir:
///   400 → "Geçersiz istek." (DTO)
///   401 → "Kod hatalı veya süresi dolmuş..."
///   429 → "Çok fazla deneme. Lütfen bekleyin."
class SmsVerifyScreen extends ConsumerStatefulWidget {
  /// Telefon önceden biliniyorsa (ör. profil doğrulama akışı) pre-fill için.
  final String? initialPhone;
  const SmsVerifyScreen({super.key, this.initialPhone});

  @override
  ConsumerState<SmsVerifyScreen> createState() => _SmsVerifyScreenState();
}

class _SmsVerifyScreenState extends ConsumerState<SmsVerifyScreen> {
  final _phoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _sending = false;
  bool _verifying = false;
  bool _codeSent = false;
  String? _info;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialPhone != null && widget.initialPhone!.isNotEmpty) {
      _phoneCtrl.text = widget.initialPhone!;
    }
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  String? _validatePhone(String? v) {
    final t = (v ?? '').trim();
    if (t.isEmpty) return 'Telefon numarası gerekli';
    // Backend regex: ^\+?[0-9]{10,15}$
    final re = RegExp(r'^\+?[0-9]{10,15}$');
    if (!re.hasMatch(t)) return 'Geçerli telefon girin (10-15 rakam, baş + opsiyonel)';
    return null;
  }

  String? _validateCode(String? v) {
    final t = (v ?? '').trim();
    if (t.isEmpty) return 'Kod gerekli';
    if (t.length != 6) return 'Kod 6 haneli olmalı';
    if (!RegExp(r'^[0-9]{6}$').hasMatch(t)) return 'Kod sadece rakamlardan oluşmalı';
    return null;
  }

  Future<void> _sendCode() async {
    final phoneErr = _validatePhone(_phoneCtrl.text);
    if (phoneErr != null) {
      setState(() => _error = phoneErr);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _info = null;
    });
    try {
      final repo = ref.read(firebaseAuthRepositoryProvider);
      await repo.requestSmsCode(_phoneCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _info = 'Doğrulama kodu telefonunuza gönderildi.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _verifying = true;
      _error = null;
      _info = null;
    });
    try {
      final repo = ref.read(firebaseAuthRepositoryProvider);
      await repo.verifySmsCode(_phoneCtrl.text.trim(), _codeCtrl.text.trim());
      if (!mounted) return;
      setState(() => _info = 'Telefon numaranız doğrulandı.');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Telefon doğrulandı.')),
      );
      // Caller'a doğrulanmış telefonu geri döndür.
      Navigator.of(context).maybePop(_phoneCtrl.text.trim());
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSend = !_sending && !_verifying;
    return Scaffold(
      appBar: AppBar(title: const Text('Telefon Doğrulama')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Telefon numaranızı girin. Size 6 haneli bir doğrulama kodu göndereceğiz.',
                  style: TextStyle(fontSize: 14, color: Colors.black87),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  enabled: !_codeSent || canSend,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9+]')),
                    LengthLimitingTextInputFormatter(16),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Telefon',
                    hintText: '+905551234567',
                    border: OutlineInputBorder(),
                  ),
                  validator: _validatePhone,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: OutlinedButton(
                    onPressed: canSend ? _sendCode : null,
                    child: _sending
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : Text(_codeSent ? 'Kodu Tekrar Gönder' : 'Kod Gönder'),
                  ),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  enabled: _codeSent && !_verifying,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  decoration: const InputDecoration(
                    labelText: '6 Haneli Kod',
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                  validator: _codeSent ? _validateCode : (_) => null,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (_codeSent && !_verifying) ? _verify : null,
                    child: _verifying
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.5, color: Colors.white),
                          )
                        : const Text('Doğrula'),
                  ),
                ),
                const SizedBox(height: 16),
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.08),
                      border: Border.all(color: Colors.red),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Colors.red)),
                  ),
                if (_info != null) ...[
                  if (_error != null) const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      border: Border.all(color: Colors.green),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_info!, style: const TextStyle(color: Colors.green)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
