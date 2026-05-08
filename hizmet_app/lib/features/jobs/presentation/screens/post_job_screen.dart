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

class PostJobScreen extends ConsumerStatefulWidget {
  const PostJobScreen({super.key});

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
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeRestoreDraft());
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
        } catch (_) {}
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
        title: const Text('İş İlanı Ver'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: _onStepContinue,
          onStepCancel: () {
            if (_currentStep > 0) setState(() => _currentStep--);
          },
          controlsBuilder: (context, details) => _buildControls(details),
          steps: [
            Step(
              title: const Text('Kategori'),
              content: _buildCategoryStep(),
              isActive: _currentStep >= 0,
              state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            ),
            Step(
              title: const Text('Detaylar'),
              content: _buildDetailsStep(),
              isActive: _currentStep >= 1,
              state: _currentStep > 1 ? StepState.complete : StepState.indexed,
            ),
            Step(
              title: const Text('Fotoğraflar'),
              content: _buildPhotosStep(),
              isActive: _currentStep >= 2,
              state: _currentStep > 2
                  ? StepState.complete
                  : StepState.indexed,
            ),
            Step(
              title: const Text('Bütçe & Konum'),
              content: _buildBudgetStep(),
              isActive: _currentStep >= 3,
              state: StepState.indexed,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControls(ControlsDetails details) {
    final isLastStep = _currentStep == 3;
    final isPhotoStep = _currentStep == 2;

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: _uploading ? null : details.onStepContinue,
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
                  : Text(
                      isLastStep
                          ? 'İlanı Yayınla'
                          : isPhotoStep
                              ? 'Fotoğrafları Yükle ve Devam Et'
                              : 'Devam Et',
                    ),
            ),
          ),
          if (_currentStep > 0) ...[
            const SizedBox(width: 12),
            TextButton(
              onPressed: details.onStepCancel,
              child: const Text('Geri'),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _onStepContinue() async {
    if (_currentStep == 0) {
      if (_selectedCategory == null) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Lütfen bir kategori seçin')));
        return;
      }
      setState(() => _currentStep++);
    } else if (_currentStep == 1) {
      if (!(_formKey.currentState?.validate() ?? false)) return;
      setState(() => _currentStep++);
    } else if (_currentStep == 2) {
      // Fotoğraf & Video adımı: en az 1 fotoğraf zorunlu
      if (_selectedPhotos.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('En az 1 fotoğraf eklemelisiniz')),
        );
        return;
      }
      setState(() => _uploading = true);
      try {
        // Fotoğrafları yükle
        final photoUrls = await ref
            .read(photoRepositoryProvider)
            .uploadJobPhotos(_selectedPhotos);
        _uploadedPhotoUrls = photoUrls;

        // Videoları yükle (varsa)
        if (_selectedVideos.isNotEmpty) {
          final videoUrls = await ref
              .read(photoRepositoryProvider)
              .uploadJobVideos(_selectedVideos);
          _uploadedVideoUrls = videoUrls;
        }

        if (mounted) setState(() => _currentStep++);
        await _persistDraftNow();
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
    } else {
      _submitJob();
    }
  }

  Widget _buildCategoryStep() {
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

  Widget _buildDetailsStep() {
    final dueDateLabel = _dueDate == null
        ? 'Esnek (tarih önemli değil)'
        : '${_dueDate!.day.toString().padLeft(2, '0')}/'
            '${_dueDate!.month.toString().padLeft(2, '0')}/'
            '${_dueDate!.year}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Teslim tarihi — ilk seçenek (Airtasker tarzı)
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ne zaman yapılmasını istiyorsunuz?',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
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
                ),
              ],
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
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 16),
        TextFormField(
          controller: _titleController,
          decoration: const InputDecoration(
              labelText: 'İş Başlığı',
              hintText: 'Örn: 3+1 Daire Boyatma'),
          validator: (v) => v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descController,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Açıklama'),
          validator: (v) => v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
        const SizedBox(height: 12),
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
      ],
    );
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

  Widget _buildPhotosStep() {
    return Column(
      children: [
        JobPhotoPicker(
          initialFiles: _selectedPhotos,
          onChanged: (files) => setState(() => _selectedPhotos = files),
        ),
        const SizedBox(height: 24),
        JobVideoPicker(
          initialFiles: _selectedVideos,
          onChanged: (files) => setState(() => _selectedVideos = files),
        ),
      ],
    );
  }

  Widget _buildBudgetStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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
        TextFormField(
          controller: _budgetController,
          keyboardType: TextInputType.number,
          decoration:
              const InputDecoration(labelText: 'Tahmini Bütçe (₺)'),
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
