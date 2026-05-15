import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_auth_repository.dart';

class TwoFactorSetupScreen extends ConsumerStatefulWidget {
  const TwoFactorSetupScreen({super.key});

  @override
  ConsumerState<TwoFactorSetupScreen> createState() =>
      _TwoFactorSetupScreenState();
}

class _TwoFactorSetupScreenState extends ConsumerState<TwoFactorSetupScreen> {
  int _step = 1;
  bool _busy = false;
  String? _secret;
  String? _qrDataUrl;
  final _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _busy = true);
    try {
      final repo = ref.read(firebaseAuthRepositoryProvider);
      final data = await repo.setup2FA();
      setState(() {
        _secret = data['secret'] as String?;
        _qrDataUrl = data['qrDataUrl'] as String?;
        _step = 2;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _enable() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('6 haneli kodu giriniz')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(firebaseAuthRepositoryProvider);
      await repo.enable2FA(code);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('İki adımlı doğrulama aktifleştirildi'),
            backgroundColor: Colors.green),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('2FA Kurulum')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: _step == 1
              ? _buildIntro()
              : _step == 2
                  ? _buildQr()
                  : _buildVerify(),
        ),
      ),
    );
  }

  Widget _buildIntro() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.shield_outlined, size: 72, color: AppColors.primary),
        const SizedBox(height: 16),
        const Text('İki Adımlı Doğrulama Kur',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        const Text(
          'Hesabınıza ek güvenlik katmanı ekleyin. Google Authenticator, '
          'Authy veya 1Password gibi bir uygulama gerekecek.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        const Spacer(),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _busy ? null : _start,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: _busy
                ? const CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2.5)
                : const Text('Başlat',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
          ),
        ),
      ],
    );
  }

  Widget _buildQr() {
    Widget qrWidget = const SizedBox.shrink();
    if (_qrDataUrl != null) {
      try {
        final base64Part = _qrDataUrl!.contains(',')
            ? _qrDataUrl!.split(',')[1]
            : _qrDataUrl!;
        qrWidget = Image.memory(base64Decode(base64Part),
            width: 220, height: 220, fit: BoxFit.contain);
      } catch (_) {
        qrWidget = const Text('QR yüklenemedi');
      }
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text('QR Kodu Tarayın',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Authenticator uygulamanızla aşağıdaki QR kodu tarayın.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: qrWidget,
          ),
          const SizedBox(height: 24),
          if (_secret != null) ...[
            const Text('Veya bu kodu manuel girin:',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            SelectableText(
              _secret!,
              style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5),
            ),
          ],
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () => setState(() => _step = 3),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Devam Et',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerify() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Doğrulama Kodu',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text(
          'Authenticator uygulamanızdaki 6 haneli kodu girin.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _codeController,
          autofocus: true,
          maxLength: 6,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 28,
              letterSpacing: 8,
              fontWeight: FontWeight.bold),
          decoration: const InputDecoration(
            filled: true,
            fillColor: Colors.white,
            counterText: '',
            hintText: '······',
          ),
          onSubmitted: (_) => _busy ? null : _enable(),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _busy ? null : _enable,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: _busy
                ? const CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2.5)
                : const Text('Aktifleştir',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16)),
          ),
        ),
      ],
    );
  }
}
