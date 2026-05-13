import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/location_picker.dart';
import '../providers/job_provider.dart';
import '../../../categories/data/category_repository.dart';
import '../../../photos/data/photo_repository.dart';
import '../../../photos/presentation/widgets/job_photo_picker.dart';
import '../../../photos/presentation/widgets/job_video_picker.dart';
import '../../../ai/data/ai_repository.dart';
import '../../../job_templates/data/job_template_repository.dart';
import '../../data/job_draft_storage.dart';
import '../../widgets/job_wizard_progress.dart';
import '../../widgets/post_job_step1.dart';
import '../../widgets/post_job_step2.dart';
import '../../widgets/post_job_step3.dart';

class PostJobScreen extends ConsumerStatefulWidget {
  /// Optional source job to clone (used by "🔁 Tekrar İlan Aç" feature).
  /// When provided, wizard fields are pre-filled from this map.
  final Map<String, dynamic>? initialJob;
  const PostJobScreen({super.key, this.initialJob});

  @override
  ConsumerState<PostJobScreen> createState() => _PostJobScreenState();
}

class _PostJobScreenState extends ConsumerState<PostJobScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController();
  final _budgetController = TextEditingController();
  final _templateNameController = TextEditingController();
  bool _saveAsTemplate = false;

  String? _selectedCategory;
  int _currentStep = 0;
  double? _lat;
  double? _lng;
  DateTime? _dueDate;

  // Fotoğraf & Video adımı için
  List<File> _selectedPhotos = [];
  List<File> _selectedVideos = [];
  List<String> _uploadedPhotoUrls = [];
  List<String> _uploadedVideoUrls = [];
  bool _uploading = false;
  bool _aiLoading = false;
  bool _aiDescLoading = false;
  bool _aiPriceLoading = false;

  // Draft autosave
  final JobDraftStorage _draftStorage = JobDraftStorage();
  Timer? _draftDebounce;
  Timer? _savedToastTimer;
  bool _showSavedToast = false;
  bool _draftRestored = false;

  @override
  void initState() {
    super.initState();
    _titleController.addListener(_scheduleDraftSave);
    _descController.addListener(_scheduleDraftSave);
    _locationController.addListener(_scheduleDraftSave);
    _budgetController.addListener(_scheduleDraftSave);
    if (widget.initialJob != null) {
      // Clone-mode: pre-fill from source job, skip draft restore prompt.
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _applyInitialJob(widget.initialJob!));
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybeRestoreDraft());
    }
  }

  void _applyInitialJob(Map<String, dynamic> j) {
    _draftRestored = true;
    _titleController.text = (j['title'] as String?) ?? '';
    _descController.text = (j['description'] as String?) ?? '';
    _locationController.text = (j['location'] as String?) ?? '';
    final budgetMin = j['budgetMin'];
    if (budgetMin is num && budgetMin > 0) {
      _budgetController.text = budgetMin.toInt().toString();
    }
    setState(() {
      _selectedCategory = j['category'] as String?;
      final lat = j['latitude'];
      final lng = j['longitude'];
      if (lat is num) _lat = lat.toDouble();
      if (lng is num) _lng = lng.toDouble();
      _uploadedPhotoUrls = ((j['photos'] as List?) ?? [])
          .map((e) => e.toString())
          .toList();
      _uploadedVideoUrls = ((j['videos'] as List?) ?? [])
          .map((e) => e.toString())
          .toList();
      // dueDate intentionally NOT cloned — old date likely past.
    });
    _draftRestored = false;
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🔁 Önceki ilan bilgileri yüklendi — düzenleyip yayınlayabilirsin'),
          backgroundColor: AppColors.primary,
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  void dispose() {
    _draftDebounce?.cancel();
    _savedToastTimer?.cancel();
    _titleController.dispose();
    _descController.dispose();
    _locationController.dispose();
    _budgetController.dispose();
    _templateNameController.dispose();
    super.dispose();
  }

  Future<void> _maybeRestoreDraft() async {
    final draft = await _draftStorage.load();
    if (!mounted || draft == null || draft.isEmpty) return;
    final saved = DateTime.fromMillisecondsSinceEpoch(draft.savedAt);
    final ago = DateTime.now().difference(saved);
    final agoLabel = ago.inMinutes < 1
        ? 'az önce'
        : ago.inHours < 1
            ? '${ago.inMinutes} dk önce'
            : ago.inDays < 1
                ? '${ago.inHours} sa önce'
                : '${ago.inDays} gün önce';
    final shouldRestore = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Taslak bulundu'),
        content: Text(
            'Önceden kaydedilmiş bir ilan taslağınız var ($agoLabel). Devam etmek ister misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hayır, sıfırla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white),
            child: const Text('Devam et'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (shouldRestore == true) {
      _applyDraft(draft);
    } else {
      await _draftStorage.clear();
    }
  }

  void _applyDraft(JobDraft d) {
    _draftRestored = true;
    _titleController.text = d.title ?? '';
    _descController.text = d.description ?? '';
    _locationController.text = d.location ?? '';
    _budgetController.text = d.budgetMin?.toStringAsFixed(0) ?? '';
    setState(() {
      _selectedCategory = d.category;
      _lat = d.latitude;
      _lng = d.longitude;
      _uploadedPhotoUrls = List<String>.from(d.photos);
      _uploadedVideoUrls = List<String>.from(d.videos);
      if (d.dueDate != null && d.dueDate!.isNotEmpty) {
        try {
          _dueDate = DateTime.parse(d.dueDate!);
        } catch (e, st) {
          debugPrint('post_job_screen.restoreDraft.parseDueDate: $e\n$st');
        }
      }
    });
    _draftRestored = false;
  }

  JobDraft _currentDraft() => JobDraft(
        title: _titleController.text,
        description: _descController.text,
        category: _selectedCategory,
        location: _locationController.text,
        budgetMin: double.tryParse(_budgetController.text),
        dueDate: _dueDate == null
            ? null
            : '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}',
        photos: _uploadedPhotoUrls,
        videos: _uploadedVideoUrls,
        latitude: _lat,
        longitude: _lng,
        savedAt: DateTime.now().millisecondsSinceEpoch,
      );

  void _scheduleDraftSave() {
    if (_draftRestored) return;
    _draftDebounce?.cancel();
    _draftDebounce = Timer(const Duration(seconds: 5), _persistDraftNow);
  }

  Future<void> _persistDraftNow() async {
    final draft = _currentDraft();
    if (draft.isEmpty) return;
    await _draftStorage.save(draft);
    if (!mounted) return;
    setState(() => _showSavedToast = true);
    _savedToastTimer?.cancel();
    _savedToastTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _showSavedToast = false);
    });
  }

  Future<void> _confirmClearDraft() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Taslağı sil?'),
        content: const Text(
            'Mevcut form içeriği ve kaydedilmiş taslak silinecek. Emin misiniz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _draftStorage.clear();
    if (!mounted) return;
    _draftRestored = true;
    _titleController.clear();
    _descController.clear();
    _locationController.clear();
    _budgetController.clear();
    _templateNameController.clear();
    setState(() {
      _selectedCategory = null;
      _selectedPhotos = [];
      _selectedVideos = [];
      _uploadedPhotoUrls = [];
      _uploadedVideoUrls = [];
      _lat = null;
      _lng = null;
      _dueDate = null;
      _currentStep = 0;
      _saveAsTemplate = false;
    });
    _draftRestored = false;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Taslak silindi')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Yeni İlan • Adım ${_currentStep + 1}/3'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_currentStep > 0) {
              setState(() => _currentStep--);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions: [
          if (_showSavedToast)
            const Padding(
              padding: EdgeInsets.only(right: 4),
              child: Center(
                child: Row(children: [
                  Icon(Icons.cloud_done, size: 16, color: Colors.white),
                  SizedBox(width: 4),
                  Text('Taslak kaydedildi',
                      style: TextStyle(fontSize: 12, color: Colors.white)),
                  SizedBox(width: 8),
                ]),
              ),
            ),
          IconButton(
            tooltip: 'Taslağı Sil',
            icon: const Icon(Icons.delete_outline),
            onPressed: _confirmClearDraft,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            JobWizardProgress(currentStep: _currentStep),
            Expanded(
              child: IndexedStack(
                index: _currentStep,
                children: [
                  PostJobStep1(body: _buildStep1Body()),
                  PostJobStep2(body: _buildStep2Body()),
                  PostJobStep3(body: _buildStep3Body()),
                ],
              ),
            ),
            _buildStickyControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildStickyControls() {
    final isLastStep = _currentStep == 2;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                flex: 1,
                child: OutlinedButton(
                  onPressed: _uploading
                      ? null
                      : () => setState(() => _currentStep--),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Geri'),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _uploading ? null : _onStepContinue,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: _uploading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : Text(isLastStep ? 'İlanı Yayınla' : 'İleri'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onStepContinue() async {
    if (_currentStep == 0) {
      // Step 1: kategori (dueDate opsiyonel — esnek default)
      if (_selectedCategory == null) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Lütfen bir kategori seçin')));
        return;
      }
      setState(() => _currentStep++);
    } else if (_currentStep == 1) {
      // Step 2: title + description (budget opsiyonel)
      if (_titleController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('İş başlığı boş bırakılamaz')));
        return;
      }
      if (_descController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Açıklama boş bırakılamaz')));
        return;
      }
      setState(() => _currentStep++);
    } else {
      // Step 3: en az 1 fotoğraf zorunlu, sonra upload + submit
      if (_selectedPhotos.isEmpty && _uploadedPhotoUrls.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('En az 1 fotoğraf eklemelisiniz')),
        );
        return;
      }
      setState(() => _uploading = true);
      try {
        if (_selectedPhotos.isNotEmpty) {
          final photoUrls = await ref
              .read(photoRepositoryProvider)
              .uploadJobPhotos(_selectedPhotos);
          _uploadedPhotoUrls = photoUrls;
        }
        if (_selectedVideos.isNotEmpty) {
          final videoUrls = await ref
              .read(photoRepositoryProvider)
              .uploadJobVideos(_selectedVideos);
          _uploadedVideoUrls = videoUrls;
        }
        await _persistDraftNow();
        if (!mounted) return;
        _submitJob();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ));
        }
      } finally {
        if (mounted) setState(() => _uploading = false);
      }
    }
  }

  Widget _buildStep1Body() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Kategori seçin',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        _buildCategoryGrid(),
        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 16),
        _buildDueDateSection(),
      ],
    );
  }

  Widget _buildCategoryGrid() {
    return ref.watch(categoriesProvider).when(
          data: (cats) => Wrap(
            spacing: 12,
            runSpacing: 12,
            children: cats.map((cat) {
              final name = cat['name'] as String? ?? '';
              final emoji = cat['icon'] as String? ?? '🔧';
              final isSelected = _selectedCategory == name;
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedCategory = name);
                  _scheduleDraftSave();
                },
                child: Container(
                  width: 80,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryLight : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Text(emoji, style: const TextStyle(fontSize: 24)),
                      const SizedBox(height: 4),
                      Text(name,
                          style: const TextStyle(fontSize: 10),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          loading: () =>
              const Center(child: CircularProgressIndicator()),
          error: (_, __) =>
              const Text('Kategoriler yüklenemedi'),
        );
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now.add(const Duration(days: 7)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      helpText: 'İşin ne zaman bitmesini istiyorsunuz?',
      confirmText: 'Seç',
      cancelText: 'Vazgeç',
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
      _scheduleDraftSave();
    }
  }

  Widget _buildDueDateSection() {
    final dueDateLabel = _dueDate == null
        ? 'Esnek (tarih önemli değil)'
        : '${_dueDate!.day.toString().padLeft(2, '0')}/'
            '${_dueDate!.month.toString().padLeft(2, '0')}/'
            '${_dueDate!.year}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Ne zaman yapılmasını istiyorsunuz?',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: _pickDueDate,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: _dueDate != null ? AppColors.primaryLight : Colors.white,
              border: Border.all(
                color: _dueDate != null ? AppColors.primary : Colors.grey.shade300,
                width: _dueDate != null ? 1.5 : 1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 18,
                    color: _dueDate != null ? AppColors.primary : Colors.grey.shade500),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(dueDateLabel,
                      style: TextStyle(
                        fontSize: 14,
                        color: _dueDate != null ? AppColors.primary : Colors.grey.shade600,
                        fontWeight: _dueDate != null ? FontWeight.w600 : FontWeight.normal,
                      )),
                ),
                if (_dueDate != null)
                  GestureDetector(
                    onTap: () => setState(() => _dueDate = null),
                    child: Icon(Icons.close, size: 16, color: Colors.grey.shade500),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () => setState(() => _dueDate = null),
          child: Row(
            children: [
              Icon(
                _dueDate == null ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                size: 16,
                color: _dueDate == null ? AppColors.primary : Colors.grey.shade400,
              ),
              const SizedBox(width: 6),
              Text('Esnek — tarih önemli değil',
                  style: TextStyle(
                      fontSize: 13,
                      color: _dueDate == null ? AppColors.primary : Colors.grey.shade500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep2Body() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _titleController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
              labelText: 'İş Başlığı',
              hintText: 'Örn: 3+1 Daire Boyatma'),
          validator: (v) => v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descController,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Açıklama'),
          validator: (v) => v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: (_aiDescLoading || _titleController.text.trim().isEmpty)
                ? null
                : _suggestDescription,
            style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            icon: _aiDescLoading
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  )
                : const Icon(Icons.auto_awesome, size: 16),
            label: Text(_aiDescLoading ? 'Üretiliyor…' : '✨ AI ile Öner'),
          ),
        ),
        const SizedBox(height: 6),
        OutlinedButton.icon(
          onPressed: _aiLoading ? null : _fillWithAI,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          icon: _aiLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                )
              : const Icon(Icons.auto_awesome, size: 18),
          label: Text(_aiLoading ? 'AI hazırlıyor…' : 'AI ile Otomatik Doldur'),
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _aiPriceLoading ? null : _suggestPrice,
            icon: _aiPriceLoading
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome, size: 18),
            label: Text(_aiPriceLoading
                ? 'Fiyat hesaplanıyor…'
                : '💰 AI Fiyat Önerisi'),
          ),
        ),
        TextFormField(
          controller: _budgetController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Tahmini Bütçe (₺)',
            hintText: 'Opsiyonel',
            prefixIcon: Icon(Icons.payments_outlined),
          ),
        ),
      ],
    );
  }

  Future<void> _suggestPrice() async {
    final desc = _descController.text.trim();
    final cat = _selectedCategory;
    if (cat == null || cat.isEmpty || desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Önce kategori ve açıklama gerekli')),
      );
      return;
    }
    setState(() => _aiPriceLoading = true);
    try {
      final result = await ref.read(aiRepositoryProvider).suggestPrice(
            category: cat,
            description: desc,
            location: _locationController.text.isEmpty
                ? null
                : _locationController.text,
          );
      if (!mounted) return;
      // Use median for the single budget field; fall back to min if 0.
      final value = result.medianPrice > 0
          ? result.medianPrice
          : (result.minPrice > 0 ? result.minPrice : result.maxPrice);
      if (value > 0) {
        _budgetController.text = value.toStringAsFixed(0);
      }
      final range =
          '${result.minPrice.toStringAsFixed(0)}-${result.maxPrice.toStringAsFixed(0)}₺';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('💡 AI önerisi: $range — ${result.reasoning}'),
          duration: const Duration(seconds: 6),
          backgroundColor: AppColors.primary,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _aiPriceLoading = false);
    }
  }

  Future<void> _fillWithAI() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Önce bir iş başlığı girin')),
      );
      return;
    }
    setState(() => _aiLoading = true);
    try {
      final result = await ref.read(aiRepositoryProvider).jobAssistant(
            title: title,
            category: _selectedCategory,
            location: _locationController.text.isEmpty ? null : _locationController.text,
          );
      if (!mounted) return;
      setState(() {
        if (_descController.text.isEmpty) {
          _descController.text = result.description;
        }
        if (_budgetController.text.isEmpty && result.suggestedBudgetMin > 0) {
          _budgetController.text = result.suggestedBudgetMin.toString();
        }
      });
      if (result.tips.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('💡 ${result.tips}'),
            duration: const Duration(seconds: 5),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _suggestDescription() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    // If existing description has content, ask before overwriting.
    if (_descController.text.trim().isNotEmpty) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Mevcut açıklamayı değiştir?'),
          content: const Text(
              'Yazdığınız açıklama AI önerisi ile değiştirilecek. Devam etmek istiyor musunuz?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Değiştir'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() => _aiDescLoading = true);
    try {
      final desc = await ref.read(aiRepositoryProvider).generateDescription(
            title: title,
            category: _selectedCategory,
            location: _locationController.text.isEmpty ? null : _locationController.text,
          );
      if (!mounted) return;
      if (desc.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI bir öneri üretemedi, tekrar deneyin')),
        );
        return;
      }
      setState(() => _descController.text = desc);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _aiDescLoading = false);
    }
  }

  Widget _buildStep3Body() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Fotoğraf & Video',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        JobPhotoPicker(
          initialFiles: _selectedPhotos,
          onChanged: (files) => setState(() => _selectedPhotos = files),
        ),
        const SizedBox(height: 16),
        JobVideoPicker(
          initialFiles: _selectedVideos,
          onChanged: (files) => setState(() => _selectedVideos = files),
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 16),
        const Text('Konum',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextFormField(
                controller: _locationController,
                readOnly: true,
                decoration: const InputDecoration(
                  labelText: 'Konum',
                  prefixIcon: Icon(Icons.location_on),
                  hintText: 'Haritadan seçin veya yazın',
                ),
              ),
            ),
            const SizedBox(width: 8),
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ElevatedButton(
                onPressed: _openLocationPicker,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(48, 52),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  padding: EdgeInsets.zero,
                ),
                child: const Icon(Icons.map_outlined, size: 22),
              ),
            ),
          ],
        ),
        if (_lat != null && _lng != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              children: [
                const Icon(Icons.check_circle,
                    color: Colors.green, size: 14),
                const SizedBox(width: 4),
                Text(
                  'Koordinat: ${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}',
                  style: const TextStyle(
                      fontSize: 11, color: Colors.green),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              CheckboxListTile(
                value: _saveAsTemplate,
                onChanged: (v) => setState(() => _saveAsTemplate = v ?? false),
                title: const Text('Bu ilanı şablon olarak kaydet',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: const Text(
                    'Benzer ilanlar için tekrar kullan',
                    style: TextStyle(fontSize: 12)),
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: AppColors.primary,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              if (_saveAsTemplate)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: TextFormField(
                    controller: _templateNameController,
                    decoration: const InputDecoration(
                      labelText: 'Şablon adı',
                      hintText: 'Örn: Standart ev temizliği',
                      isDense: true,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (_uploadedPhotoUrls.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.photo_library,
                    color: Colors.green.shade700, size: 18),
                const SizedBox(width: 8),
                Text(
                  '${_uploadedPhotoUrls.length} fotoğraf hazır',
                  style: TextStyle(
                      color: Colors.green.shade800,
                      fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _openLocationPicker() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialAddress: _locationController.text,
        ),
      ),
    );
    if (result != null) {
      setState(() {
        _locationController.text = result['address'] as String;
        _lat = result['lat'] as double;
        _lng = result['lng'] as double;
      });
      _scheduleDraftSave();
    }
  }

  void _submitJob() async {
    final jobData = {
      'title': _titleController.text,
      'description': _descController.text,
      'location': _locationController.text.isEmpty
          ? 'Belirtilmedi'
          : _locationController.text,
      'budgetMin': double.tryParse(_budgetController.text) ?? 0,
      'category': _selectedCategory,
      if (_lat != null) 'latitude': _lat,
      if (_lng != null) 'longitude': _lng,
      if (_uploadedPhotoUrls.isNotEmpty) 'photos': _uploadedPhotoUrls,
      if (_uploadedVideoUrls.isNotEmpty) 'videos': _uploadedVideoUrls,
      if (_dueDate != null)
        'dueDate':
            '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}',
    };

    await ref.read(jobsProvider.notifier).addJob(jobData);
    await _draftStorage.clear();

    if (_saveAsTemplate) {
      final tplName = _templateNameController.text.trim().isEmpty
          ? _titleController.text.trim()
          : _templateNameController.text.trim();
      try {
        await ref.read(jobTemplateRepositoryProvider).create({
          'name': tplName,
          'title': _titleController.text,
          'description': _descController.text,
          'category': _selectedCategory,
          'location': _locationController.text.isEmpty
              ? 'Belirtilmedi'
              : _locationController.text,
          if (double.tryParse(_budgetController.text) != null)
            'budgetMin': double.parse(_budgetController.text),
          'photos': const <String>[],
        });
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Şablon kaydedilemedi: ${e.toString().replaceFirst('Exception: ', '')}'),
            backgroundColor: AppColors.error,
          ));
        }
      }
    }

    if (mounted) {
      context.pushReplacement('/ilan-basarili');
    }
  }
}
