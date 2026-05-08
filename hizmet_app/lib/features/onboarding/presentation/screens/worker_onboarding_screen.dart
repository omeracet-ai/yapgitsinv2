import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../profile/widgets/profile_completion_card.dart';
import '../../../service_requests/data/service_request_repository.dart';
import 'worker_steps/step1_categories.dart';
import 'worker_steps/step2_bio.dart';
import 'worker_steps/step3_rate.dart';
import 'worker_steps/step4_location.dart';
import 'worker_steps/step5_identity.dart';

/// Phase 129 — Worker onboarding wizard. 5 step IndexedStack.
/// Sonda toplu PATCH /users/me ile kategori/bio/rate/şehir/identityPhoto kaydeder.
/// Skip → wizard kapan, Phase 48 banner'da "Tamamla %X" gösterilir.
class WorkerOnboardingScreen extends ConsumerStatefulWidget {
  const WorkerOnboardingScreen({super.key});

  @override
  ConsumerState<WorkerOnboardingScreen> createState() =>
      _WorkerOnboardingScreenState();
}

class _WorkerOnboardingScreenState
    extends ConsumerState<WorkerOnboardingScreen> {
  int _step = 0;
  static const _total = 5;

  // Step state
  List<String> _categories = [];
  final _bioCtrl = TextEditingController();
  final _minCtrl = TextEditingController();
  final _maxCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _districtCtrl = TextEditingController();
  int _radiusKm = 20;
  File? _identityPhoto;

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _bioCtrl.dispose();
    _minCtrl.dispose();
    _maxCtrl.dispose();
    _cityCtrl.dispose();
    _districtCtrl.dispose();
    super.dispose();
  }

  bool get _canAdvance {
    switch (_step) {
      case 0:
        return _categories.isNotEmpty;
      case 1:
        return _bioCtrl.text.trim().length >= 50;
      case 2:
        return true; // optional
      case 3:
        return true; // optional
      case 4:
        return _identityPhoto != null;
      default:
        return false;
    }
  }

  void _next() {
    if (!_canAdvance) {
      setState(() => _error = 'Bu adımı tamamlamadan ilerleyemezsin.');
      return;
    }
    setState(() {
      _error = null;
      if (_step < _total - 1) _step++;
    });
  }

  void _back() {
    if (_step > 0) setState(() => _step--);
  }

  /// Skip → wizard kapan, anasayfaya dön. Phase 48 banner görünür kalır.
  void _skip() {
    if (_saving) return;
    context.go('/');
  }

  /// Sonda toplu submit — Step 5'te "Tamamla" butonu çağırır.
  Future<void> _finish() async {
    if (_categories.isEmpty) {
      setState(() {
        _step = 0;
        _error = 'En az 1 kategori seçmelisin.';
      });
      return;
    }
    if (_bioCtrl.text.trim().length < 50) {
      setState(() {
        _step = 1;
        _error = 'Bio en az 50 karakter olmalı.';
      });
      return;
    }
    if (_identityPhoto == null) {
      setState(() {
        _step = 4;
        _error = 'Kimlik fotoğrafı zorunlu.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      // 1. Identity upload
      final repo = ref.read(serviceRequestRepositoryProvider);
      final idUrl = await repo.uploadIdentityPhoto(_identityPhoto!);

      // 2. PATCH /users/me toplu
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
      final min = double.tryParse(_minCtrl.text.trim().replaceAll(',', '.'));
      final max = double.tryParse(_maxCtrl.text.trim().replaceAll(',', '.'));
      final body = <String, dynamic>{
        'workerCategories': _categories,
        'workerBio': _bioCtrl.text.trim(),
        if (min != null) 'hourlyRateMin': min,
        if (max != null) 'hourlyRateMax': max,
        if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
        if (_districtCtrl.text.trim().isNotEmpty)
          'district': _districtCtrl.text.trim(),
        'serviceRadiusKm': _radiusKm,
        'identityPhotoUrl': idUrl,
        'isAvailable': true,
      };
      final res = await dio.patch(
        '/users/me',
        data: body,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      // 3. Cache + auth state + completion invalidate
      await prefs.setString('user_data', jsonEncode(res.data));
      ref
          .read(authStateProvider.notifier)
          .updateUserData(Map<String, dynamic>.from(res.data as Map));
      ref.invalidate(profileCompletionProvider);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Tebrikler! Usta profilin hazır 🎉'),
        backgroundColor: AppColors.success,
      ));
      context.go('/');
    } on DioException catch (e) {
      setState(() {
        _saving = false;
        _error =
            e.response?.data?['message']?.toString() ?? 'Kayıt başarısız';
      });
    } catch (e) {
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('Usta Başlangıç (${_step + 1}/$_total)'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _skip,
            child: const Text('Atla',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_step + 1) / _total,
            backgroundColor: AppColors.border,
            color: AppColors.primary,
            minHeight: 4,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(
              index: _step,
              children: [
                WorkerOnboardingStep1Categories(
                  selected: _categories,
                  onChanged: (v) => setState(() => _categories = v),
                ),
                WorkerOnboardingStep2Bio(
                  controller: _bioCtrl,
                  onChanged: () => setState(() {}),
                ),
                WorkerOnboardingStep3Rate(
                  minCtrl: _minCtrl,
                  maxCtrl: _maxCtrl,
                ),
                WorkerOnboardingStep4Location(
                  cityCtrl: _cityCtrl,
                  districtCtrl: _districtCtrl,
                  radiusKm: _radiusKm,
                  onRadiusChanged: (v) => setState(() => _radiusKm = v),
                ),
                WorkerOnboardingStep5Identity(
                  identityPhoto: _identityPhoto,
                  onChanged: (f) => setState(() => _identityPhoto = f),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(_error!,
                    style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
            ),
          // Sticky bottom bar
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  if (_step > 0)
                    OutlinedButton.icon(
                      onPressed: _saving ? null : _back,
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Geri'),
                    ),
                  const Spacer(),
                  if (_step < _total - 1)
                    ElevatedButton.icon(
                      onPressed: (_saving || !_canAdvance) ? null : _next,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 14),
                      ),
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('İleri'),
                    )
                  else
                    ElevatedButton.icon(
                      onPressed: (_saving || !_canAdvance) ? null : _finish,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 14),
                      ),
                      icon: _saving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.check),
                      label: Text(_saving ? 'Kaydediliyor…' : 'Tamamla'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
