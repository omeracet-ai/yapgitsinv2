import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../providers/auth_provider.dart';
import '../../../../l10n/app_localizations.dart';
// TODO(P190): migrate remaining strings to AppLocalizations

class LoginScreen extends ConsumerStatefulWidget {
  final String? returnTo;

  const LoginScreen({super.key, this.returnTo});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  ProviderSubscription<AuthState>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = ref.listenManual<AuthState>(authStateProvider, (previous, next) {
      if (!mounted) return;
      if (next is AuthAuthenticated) {
        ref.read(selectedTabProvider.notifier).state = 4;
        context.go(widget.returnTo ?? '/');
      } else if (next is AuthError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.message),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _sub?.close();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text(AppLocalizations.of(context).emailPasswordEmpty)),
      );
      return;
    }
    final result = await ref.read(authStateProvider.notifier).login(email, password);
    if (!mounted) return;
    if (result['requires2FA'] == true && result['tempToken'] != null) {
      context.push('/2fa-challenge', extra: {
        'tempToken': result['tempToken'] as String,
        'returnTo': widget.returnTo,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final isLoading = authState is AuthLoading;
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.textPrimary),
          tooltip: 'Anasayfa',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              Text(
                l.welcomeTitle,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
              ).animate().fade().slideX(begin: -0.1),
              const SizedBox(height: 8),
              Text(
                l.loginSubtitle,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 16),
              ).animate().fade(delay: 200.ms).slideX(begin: -0.1),
              const SizedBox(height: 48),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                enabled: !isLoading,
                decoration: InputDecoration(
                  labelText: l.loginEmailLabel,
                  filled: true,
                  fillColor: Colors.white,
                  prefixIcon: const Icon(Icons.email_outlined),
                ),
              ).animate().fade(delay: 300.ms).slideY(begin: 0.1),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                enabled: !isLoading,
                onSubmitted: (_) => isLoading ? null : _login(),
                decoration: InputDecoration(
                  labelText: l.loginPasswordLabel,
                  filled: true,
                  fillColor: Colors.white,
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ).animate().fade(delay: 400.ms).slideY(begin: 0.1),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor:
                        AppColors.primary.withValues(alpha: 0.6),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(l.loginButton,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16)),
                ),
              ).animate().fade(delay: 500.ms).scale(),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: isLoading ? null : () => context.push('/forgot-password'),
                  child: Text(l.forgotPassword),
                ),
              ).animate().fade(delay: 550.ms),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: isLoading ? null : () => context.push('/kayit-ol'),
                  child: Text(l.noAccountRegister),
                ),
              ).animate().fade(delay: 600.ms),
            ],
          ),
        ),
      ),
    );
  }
}
