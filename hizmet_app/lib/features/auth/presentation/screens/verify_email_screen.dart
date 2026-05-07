import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/auth_repository.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  final String token;
  const VerifyEmailScreen({super.key, required this.token});

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  bool _loading = true;
  bool _success = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _verify());
  }

  Future<void> _verify() async {
    if (widget.token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Geçersiz veya süresi dolmuş kod';
      });
      return;
    }
    try {
      await ref.read(authRepositoryProvider).confirmEmailVerification(widget.token);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Email Doğrulama'),
        backgroundColor: AppColors.primary,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: _loading
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
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
