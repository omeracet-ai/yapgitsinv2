import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Phase 255 — Hesap silme onay diyaloğu (2 adımlı flow).
///
/// **Step 0:** Mevcut şifre girişi (obscured, en az 6 karakter).
/// **Step 1:** "HESAP SİL" yazarak final onay + büyük uyarı kutusu.
///
/// [onConfirm] step 1 başarıyla tamamlandığında çağrılır. Çağıran widget
/// gerçek silme isteğini (auth service) tetiklemekten sorumludur; bu diyalog
/// sadece UI / doğrulama akışını yönetir.
class DeleteConfirmationDialog extends StatefulWidget {
  const DeleteConfirmationDialog({super.key, required this.onConfirm});

  /// Step 1 onaylandığında çağrılır. Parametre: kullanıcının girdiği şifre.
  final void Function({required String password}) onConfirm;

  @override
  State<DeleteConfirmationDialog> createState() =>
      _DeleteConfirmationDialogState();
}

class _DeleteConfirmationDialogState extends State<DeleteConfirmationDialog> {
  static const String _confirmPhrase = 'HESAP SİL';

  int _step = 0;
  final TextEditingController _passwordCtrl = TextEditingController();
  final TextEditingController _confirmCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    _passwordCtrl.addListener(_onChanged);
    _confirmCtrl.addListener(_onChanged);
  }

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _onChanged() => setState(() {});

  bool get _step0Valid => _passwordCtrl.text.trim().length >= 6;
  bool get _step1Valid => _confirmCtrl.text.trim() == _confirmPhrase;

  void _next() {
    if (!_step0Valid) return;
    setState(() => _step = 1);
  }

  void _back() {
    setState(() => _step = 0);
  }

  void _submit() {
    if (!_step1Valid) return;
    Navigator.of(context).pop();
    widget.onConfirm(password: _passwordCtrl.text);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.error, size: 24),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _step == 0 ? 'Hesabı Sil' : 'Son Onay',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close,
                        color: AppColors.textSecondary, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_step == 0) _buildStep0() else _buildStep1(),
              const SizedBox(height: 16),
              _buildInfoBox(),
              const SizedBox(height: 20),
              _buildActions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep0() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Devam etmek için mevcut şifrenizi girin.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordCtrl,
          obscureText: _obscure,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'Şifreniz',
            hintStyle: const TextStyle(color: AppColors.textHint),
            filled: true,
            fillColor: AppColors.surfaceElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.primary),
            ),
            suffixIcon: IconButton(
              icon: Icon(
                _obscure ? Icons.visibility_off : Icons.visibility,
                color: AppColors.textSecondary,
                size: 20,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.error.withValues(alpha: 0.1),
            border: Border.all(color: AppColors.error, width: 1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.error_outline,
                  color: AppColors.error, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Bu işlem geri alınamaz. Onaylamak için aşağıya "$_confirmPhrase" yazın.',
                  style: TextStyle(
                    color: AppColors.error,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _confirmCtrl,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(
            color: AppColors.textPrimary,
            letterSpacing: 1.2,
          ),
          decoration: InputDecoration(
            hintText: _confirmPhrase,
            hintStyle: TextStyle(
              color: AppColors.textHint.withValues(alpha: 0.6),
              letterSpacing: 1.2,
            ),
            filled: true,
            fillColor: AppColors.surfaceElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: _step1Valid ? AppColors.error : AppColors.primary,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoBox() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: AppColors.primary, size: 16),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              '30 gün içinde geri alabilirsiniz',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    if (_step == 0) {
      return Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                foregroundColor: AppColors.textSecondary,
              ),
              child: const Text('İptal'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: _step0Valid ? _next : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.secondary,
                disabledBackgroundColor:
                    AppColors.primary.withValues(alpha: 0.3),
                disabledForegroundColor:
                    AppColors.secondary.withValues(alpha: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                'Devam',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      );
    }
    return Row(
      children: [
        Expanded(
          child: TextButton(
            onPressed: _back,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              foregroundColor: AppColors.textSecondary,
            ),
            child: const Text('Geri'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: _step1Valid ? _submit : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              disabledBackgroundColor:
                  AppColors.error.withValues(alpha: 0.3),
              disabledForegroundColor: Colors.white.withValues(alpha: 0.6),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Hesabı Sil',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}
