import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_auth_repository.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  final String token;
  const VerifyEmailScreen({super.key, required this.token});

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  bool _loading = true;
  bool _success = false;
  bool _noToken = false;
  bool _resending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _verify());
  }

  Future<void> _verify() async {
    if (widget.token.isEmpty) {
      // Bu ekran e-posta doğrulama BAĞLANTISININ callback'i (token ister).
      // Login akışı "e-postanı doğrula" demek için tokensiz push ediyor;
      // eskiden bu durum sahte "Geçersiz veya süresi dolmuş kod" hatası
      // gösteriyordu. Artık nötr "gelen kutunu kontrol et" prompt'u.
      setState(() {
        _loading = false;
        _noToken = true;
      });
      return;
    }
    try {
      await ref.read(firebaseAuthRepositoryProvider).confirmEmailVerification(widget.token);
      if (!mounted) return;
      setState(() {
        _loading = false;
        _success = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Geçersiz veya süresi dolmuş kod';
      });
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    try {
      await ref.read(firebaseAuthRepositoryProvider).requestEmailVerification();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Doğrulama e-postası tekrar gönderildi.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gönderilemedi, birazdan tekrar deneyin.')),
      );
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Email Doğrulama'),
        backgroundColor: AppColors.headerBackground(context),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: _loading
              ? const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 24),
                    Text('Email doğrulanıyor...',
                        style: TextStyle(fontSize: 16)),
                  ],
                )
              : _success
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle,
                            size: 96, color: Colors.green),
                        const SizedBox(height: 24),
                        const Text('Email doğrulandı 🎉',
                            style: TextStyle(
                                fontSize: 22, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => context.go('/'),
                            child: const Text('Devam Et'),
                          ),
                        ),
                      ],
                    )
                  : _noToken
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.mark_email_unread_outlined,
                            size: 96, color: AppColors.primary),
                        const SizedBox(height: 24),
                        const Text(
                          'E-posta adresinize bir doğrulama bağlantısı '
                          'gönderdik. Gelen kutunuzu (ve spam klasörünü) '
                          'kontrol edin.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _resending ? null : _resend,
                            child: _resending
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Text('Tekrar Gönder'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: () => context.go('/'),
                            child: const Text('Ana Sayfaya Dön'),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cancel,
                            size: 96, color: AppColors.error),
                        const SizedBox(height: 24),
                        Text(_error ?? 'Geçersiz veya süresi dolmuş kod',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 16)),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => context.go('/?tab=4'),
                            child: const Text('Tekrar Talep Et'),
                          ),
                        ),
                      ],
                    ),
        ),
      ),
    );
  }
}
