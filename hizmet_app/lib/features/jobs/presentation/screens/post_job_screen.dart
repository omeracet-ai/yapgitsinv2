import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/location_picker.dart';
import '../providers/job_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'my_jobs_screen.dart' show myJobsProvider;
import '../../../categories/data/category_repository.dart';
import '../../../photos/data/photo_repository.dart';
import '../../../photos/presentation/widgets/job_photo_picker.dart';
// import '../../../photos/presentation/widgets/job_video_picker.dart'; // video upload UI hidden
import '../../../ai/data/ai_repository.dart';
import '../../../job_templates/data/job_template_repository.dart';
import '../../data/job_draft_storage.dart';
import '../../widgets/job_wizard_progress.dart';
import '../../widgets/post_job_step1.dart';
import '../../widgets/post_job_step2.dart';
import '../../../../l10n/app_localizations.dart';

class PostJobScreen extends ConsumerStatefulWidget {
  /// Optional source job to clone (used by "🔁 Tekrar İlan Aç" feature).
  /// When provided, wizard fields are pre-filled from this map.
  final Map<String, dynamic>? initialJob;

  /// Phase Two-Sided — 'request' (müşteri talebi, default) veya 'offer'
  /// (usta hizmet ilanı). UI etiketleri ve backend payload buna göre değişir.
  final String kind;

  /// Profil → "Teklif Yap" akışı: form kategori chip'leri sadece bu listeyle
  /// sınırlı; ustanın yapmadığı kategoride ilan veremezsin. null = tüm
  /// kategoriler (varsayılan).
  final List<String>? allowedCategories;

  /// Anasayfa arama çubuğundan gelen otomatik kategori seçimi. Metinden eşleşen
  /// kategori adı (tam isim). Verilirse form bu kategoriyle açılır ve taslak
  /// geri-yükleme istemi atlanır. null = normal akış.
  final String? initialCategory;

  /// İş detayı offer kartındaki "Bu Ustaya Özel İlan Aç" CTA'sından gelir.
  /// Verilirse form üstünde "Bu ilan sadece [name] için" bilgi banner'ı
  /// gösterilir. Backend gating bekleniyor (Phase TBD); şu an yalnız UI hint.
  final String? targetWorkerId;
  final String? targetWorkerName;

  const PostJobScreen({
    super.key,
    this.initialJob,
    this.kind = 'request',
    this.allowedCategories,
    this.initialCategory,
    this.targetWorkerId,
    this.targetWorkerName,
  });

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
  /// Phase 266 — saat (HH:MM, opsiyonel).
  TimeOfDay? _dueTime;
  /// Phase 266 — "Tüm saatler" toggle. true ise _dueTime yok sayılır.
  bool _anyTime = true;
  /// Phase 265 — saat dilimi esneklik durumu.
  /// 'flexible' = esnek, 'specific' = belirli saat, 'urgent' = acil/aynı gün.
  String _scheduleFlexibility = 'flexible';

  // Fotoğraf & Video adımı için
  List<XFile> _selectedPhotos = [];
  List<XFile> _selectedVideos = [];
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
    } else if (widget.initialCategory != null &&
        widget.initialCategory!.isNotEmpty) {
      // Anasayfa aramasından kategori-hedefli giriş: kategoriyi ön-seç, taslak
      // geri-yükleme istemini atla (kullanıcı yeni, niyetli bir akış başlattı).
      _selectedCategory = widget.initialCategory;
      // Adım 2 "iş başlığı" alanını filtreyle gelen kategori adıyla otomatik
      // doldur (kullanıcı isterse düzenler).
      _titleController.text = widget.initialCategory!;
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
      // Phase 266 — saat dilimi esnekliği + saat alanları pre-fill.
      final flex = j['scheduleFlexibility'] as String?;
      if (flex == 'flexible' || flex == 'specific' || flex == 'urgent') {
        _scheduleFlexibility = flex!;
      }
      final dueTimeStr = j['dueTime'] as String?;
      if (dueTimeStr != null && dueTimeStr.isNotEmpty) {
        final parts = dueTimeStr.split(':');
        if (parts.length == 2) {
          final h = int.tryParse(parts[0]);
          final m = int.tryParse(parts[1]);
          if (h != null && m != null) {
            _dueTime = TimeOfDay(hour: h, minute: m);
          }
        }
      }
      final anyTime = j['dueAnyTime'];
      if (anyTime is bool) {
        _anyTime = anyTime;
      }
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
    final l = AppLocalizations.of(context);
    final shouldRestore = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.postJobDraftFound),
        content: Text(
            'Önceden kaydedilmiş bir ilan taslağınız var ($agoLabel). Devam etmek ister misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l.postJobDraftDiscard),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white),
            child: Text(l.postJobDraftContinue),
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
      // Phase 266 — saat alanları + esneklik
      final flex = d.scheduleFlexibility;
      if (flex == 'flexible' || flex == 'specific' || flex == 'urgent') {
        _scheduleFlexibility = flex!;
      }
      _anyTime = d.dueAnyTime;
      if (d.dueTime != null && d.dueTime!.isNotEmpty) {
        final parts = d.dueTime!.split(':');
        if (parts.length == 2) {
          final h = int.tryParse(parts[0]);
          final m = int.tryParse(parts[1]);
          if (h != null && m != null) {
            _dueTime = TimeOfDay(hour: h, minute: m);
          }
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
        dueTime: (_anyTime || _dueTime == null)
            ? null
            : '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}',
        dueAnyTime: _anyTime,
        scheduleFlexibility: _scheduleFlexibility,
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
      _selectedPhotos = <XFile>[];
      _selectedVideos = <XFile>[];
      _uploadedPhotoUrls = [];
      _uploadedVideoUrls = [];
      _lat = null;
      _lng = null;
      _dueDate = null;
      _dueTime = null;
      _anyTime = true;
      _scheduleFlexibility = 'flexible';
      _currentStep = 0;
      _saveAsTemplate = false;
    });
    _draftRestored = false;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context).postJobDraftDeleted)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          '${widget.kind == 'offer' ? 'Yeni Hizmet İlanı' : 'Yeni İlan'} • Adım ${_currentStep + 1}/2',
        ),
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
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Row(children: [
                  const Icon(Icons.cloud_done, size: 16, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(AppLocalizations.of(context).postJobDraftSaved,
                      style: const TextStyle(fontSize: 12, color: Colors.white)),
                  const SizedBox(width: 8),
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
            if (widget.targetWorkerId != null && widget.targetWorkerName != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.30)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.person_pin_rounded,
                        color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Bu ilan ${widget.targetWorkerName} için özel olarak '
                        'açılıyor.',
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            JobWizardProgress(
              currentStep: _currentStep,
              labels: const ['Detaylar', 'Foto & Konum'],
            ),
            Expanded(
              child: IndexedStack(
                index: _currentStep,
                children: [
                  // Phase 284 — Adım 1: Başlık + Açıklama + Kategori + Tarih +
                  // Zaman + Bütçe. Adım 2: yalnızca Foto/Video + Konum.
                  PostJobStep1(body: _buildStep1Body()),
                  PostJobStep2(body: _buildStep2Body()),
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
    final isLastStep = _currentStep == 1;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
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
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(AppLocalizations.of(context).back),
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
                  padding: const EdgeInsets.symmetric(vertical: 11),
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
                    : Text(isLastStep ? AppLocalizations.of(context).postJobSubmit : AppLocalizations.of(context).next),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onStepContinue() async {
    if (_currentStep == 0) {
      // Phase 284 — Adım 1: title + desc + kategori zorunlu; tarih/saat/zaman/
      // bütçe opsiyonel (Belirli modunda tarih+saat aşağıda Adım 2 öncesi de
      // tekrar kontrol edilir).
      if (_titleController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).postJobTitleRequired)));
        return;
      }
      if (_descController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).postJobDescriptionRequired)));
        return;
      }
      if (_selectedCategory == null) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).postJobCategoryRequired)));
        return;
      }
      setState(() => _currentStep++);
    } else {
      // Phase 284 — Adım 2: foto + konum zorunlu; sonra upload + submit.
      if (_selectedPhotos.isEmpty && _uploadedPhotoUrls.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context).postJobPhotoRequired)),
        );
        return;
      }
      // Phase 152 — Konum zorunlu. Şehir merkezine düşen ilanları azaltmak
      // için harita pin'i + okunabilir adres ikisi de zorunlu.
      if (_lat == null || _lng == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Konum seçin — haritadan pin koyun veya "Konumumu Kullan" deyin.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      if (_locationController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Adres alanı boş — haritadan konum seçmelisiniz.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      // Phase 266 — "Belirli" mod → tarih+saat zorunlu
      if (_scheduleFlexibility == 'specific' &&
          (_dueDate == null || _dueTime == null)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Belirli saat seçtin — Adım 1\'de tarih ve saat doldur.'),
            backgroundColor: AppColors.error,
          ),
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
    // Phase 284 — Adım 1: Başlık + Açıklama + Kategori + Tarih + Zaman + Bütçe.
    // Adım 2'de yalnızca Foto/Video + Konum kalır.
    // Phase 286 — dikey ekran kullanımı ~%25 sıkıştırıldı (15/12 düzeni 20/16'nın yerine).
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildTitleDescSection(),
        const SizedBox(height: 15),
        const Divider(height: 1),
        const SizedBox(height: 12),
        Text(AppLocalizations.of(context).postJobCategorySelect,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        _buildCategoryGrid(),
        const SizedBox(height: 15),
        const Divider(height: 1),
        const SizedBox(height: 12),
        _buildDueDateSection(),
        const SizedBox(height: 15),
        const Divider(height: 1),
        const SizedBox(height: 12),
        _buildScheduleFlexSection(),
        const SizedBox(height: 15),
        const Divider(height: 1),
        const SizedBox(height: 12),
        _buildBudgetSection(),
      ],
    );
  }

  Widget _buildCategoryGrid() {
    return ref.watch(categoriesProvider).when(
          data: (allCats) {
            // Profil → "Teklif Yap" akışında ustanın workerCategories'i ile
            // sınırla; başka senaryolarda tüm kategoriler görünür.
            final allowed = widget.allowedCategories;
            final cats = (allowed != null && allowed.isNotEmpty)
                ? allCats.where((c) {
                    final n = c['name'] as String? ?? '';
                    return allowed.contains(n);
                  }).toList()
                : allCats;
            // Phase Mobile7 — chip grid → tek dropdown
            final items = cats.map((cat) {
              final name = cat['name'] as String? ?? '';
              final emoji = cat['icon'] as String? ?? '🔧';
              return DropdownMenuItem<String>(
                value: name,
                child: Row(
                  children: [
                    Text(emoji, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(name,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 14, color: AppColors.textPrimary)),
                    ),
                  ],
                ),
              );
            }).toList();
            final valueExists =
                _selectedCategory != null &&
                    cats.any((c) => c['name'] == _selectedCategory);
            return DropdownButtonFormField<String>(
              initialValue: valueExists ? _selectedCategory : null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kategori Seç',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              dropdownColor: AppColors.surface,
              style: TextStyle(color: AppColors.textPrimary),
              items: items,
              onChanged: (v) {
                setState(() => _selectedCategory = v);
                _scheduleDraftSave();
              },
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Kategori seçin' : null,
            );
          },
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

  /// Phase 266 — Saat seçici.
  Future<void> _pickDueTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _dueTime ?? const TimeOfDay(hour: 9, minute: 0),
      helpText: 'Saat seç',
      confirmText: 'Seç',
      cancelText: 'Vazgeç',
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.primary),
        ),
        child: MediaQuery(
          data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        ),
      ),
    );
    if (picked != null) {
      setState(() {
        _dueTime = picked;
        _anyTime = false; // saat seçildi → "tüm saatler" otomatik kapan
      });
      _scheduleDraftSave();
    }
  }

  Widget _buildDueDateSection() {
    final dueDateLabel = _dueDate == null
        ? 'Esnek (tarih önemli değil)'
        : '${_dueDate!.day.toString().padLeft(2, '0')}/'
            '${_dueDate!.month.toString().padLeft(2, '0')}/'
            '${_dueDate!.year}';
    final dueTimeLabel = _anyTime
        ? 'Tüm saatler'
        : (_dueTime == null
            ? 'Saat — opsiyonel'
            : '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}');
    final timeActive = !_anyTime && _dueTime != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ne zaman yapılmasını istiyorsunuz?',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tarih kutusu
            Expanded(
              flex: 3,
              child: GestureDetector(
                onTap: _pickDueDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  decoration: BoxDecoration(
                    color: _dueDate != null ? AppColors.primaryLight : AppColors.surface,
                    border: Border.all(
                      color: _dueDate != null ? AppColors.primary : AppColors.border,
                      width: _dueDate != null ? 1.5 : 1,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today_outlined,
                          size: 18,
                          color: _dueDate != null ? AppColors.primary : AppColors.textSecondary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(dueDateLabel,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: _dueDate != null ? AppColors.primary : AppColors.textPrimary,
                              fontWeight: _dueDate != null ? FontWeight.w600 : FontWeight.normal,
                            )),
                      ),
                      if (_dueDate != null)
                        GestureDetector(
                          onTap: () => setState(() => _dueDate = null),
                          child: const Icon(Icons.close, size: 16, color: Colors.black54),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Saat kutusu (Phase 266)
            Expanded(
              flex: 2,
              child: GestureDetector(
                onTap: _anyTime ? null : _pickDueTime,
                child: Opacity(
                  opacity: _anyTime ? 0.55 : 1,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    decoration: BoxDecoration(
                      color: timeActive ? AppColors.primaryLight : AppColors.surface,
                      border: Border.all(
                        color: timeActive ? AppColors.primary : AppColors.border,
                        width: timeActive ? 1.5 : 1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.access_time_outlined,
                            size: 18,
                            color: timeActive ? AppColors.primary : AppColors.textSecondary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(dueTimeLabel,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: timeActive ? AppColors.primary : AppColors.textPrimary,
                                fontWeight: timeActive ? FontWeight.w600 : FontWeight.normal,
                              )),
                        ),
                        if (timeActive)
                          GestureDetector(
                            onTap: () => setState(() => _dueTime = null),
                            child: const Icon(Icons.close, size: 16, color: Colors.black54),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        // Phase 266 — "Tüm saatler" toggle
        Row(
          children: [
            Switch(
              value: _anyTime,
              onChanged: (v) {
                setState(() {
                  _anyTime = v;
                  if (v) _dueTime = null;
                });
                _scheduleDraftSave();
              },
              activeThumbColor: AppColors.primary,
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                'Tüm saatler (saat farketmez)',
                style: TextStyle(
                  fontSize: 13,
                  color: _anyTime ? AppColors.primary : AppColors.textSecondary,
                  fontWeight: _anyTime ? FontWeight.w600 : FontWeight.normal,
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
    );
  }

  // Phase 284 — Eski _buildStep2Body iki bağımsız bölüme ayrıldı; Adım 1
  // bunları kategori/tarih/zaman ile birlikte birleştiriyor.
  Widget _buildTitleDescSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _titleController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
              labelText: AppLocalizations.of(context).postJobTitle,
              hintText: AppLocalizations.of(context).postJobTitleHint),
          validator: (v) => v?.isEmpty ?? true ? AppLocalizations.of(context).fieldRequired : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _descController,
          maxLines: 3,
          decoration: InputDecoration(labelText: AppLocalizations.of(context).postJobDescription),
          validator: (v) => v?.isEmpty ?? true ? AppLocalizations.of(context).fieldRequired : null,
        ),
        const SizedBox(height: 4),
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
      ],
    );
  }

  Widget _buildBudgetSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _budgetController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: AppLocalizations.of(context).postJobBudget,
            hintText: AppLocalizations.of(context).postJobBudgetHint,
            prefixIcon: const Icon(Icons.payments_outlined),
          ),
        ),
        const SizedBox(height: 8),
        // Phase 285 — AI fiyat önerisi bütçe alanının ALTINDA, yeşil uyarı
        // bandı olarak. Buton banner içinde tıklanabilir.
        InkWell(
          onTap: _aiPriceLoading ? null : _suggestPrice,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: AppColors.success.withValues(alpha: 0.45)),
            ),
            child: Row(
              children: [
                if (_aiPriceLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppColors.success),
                  )
                else
                  const Icon(Icons.auto_awesome,
                      size: 18, color: AppColors.success),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _aiPriceLoading
                        ? 'Fiyat hesaplanıyor…'
                        : '💰 AI fiyat tahmini öner',
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.success,
                        fontWeight: FontWeight.w600),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded,
                    size: 12, color: AppColors.success),
              ],
            ),
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

  /// Phase 266 — chip tap side effects (flexible/specific/urgent).
  void _applyScheduleFlexibility(String value) {
    setState(() {
      _scheduleFlexibility = value;
      switch (value) {
        case 'flexible':
          _anyTime = true;
          _dueTime = null;
          break;
        case 'specific':
          // Belirli saat — Adım 1'de tarih+saat girilmesi beklenir.
          _anyTime = false;
          break;
        case 'urgent':
          _dueDate ??= DateTime.now();
          _anyTime = true;
          _dueTime = null;
          break;
      }
    });
    _scheduleDraftSave();
  }

  /// Phase 266 — Adım 3 dinamik özet satırı.
  String _scheduleSummary() {
    switch (_scheduleFlexibility) {
      case 'urgent':
        return '⚡ Acil — bugün başlamalı, saat esnek.';
      case 'specific':
        if (_dueDate == null || _dueTime == null) {
          return '⚠ Adım 1\'de tarih + saat seç (belirli mod).';
        }
        final d =
            '${_dueDate!.day.toString().padLeft(2, '0')}/${_dueDate!.month.toString().padLeft(2, '0')}/${_dueDate!.year}';
        final t =
            '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}';
        return '✓ $d • $t';
      case 'flexible':
      default:
        return '✓ Esnek — usta seninle anlaşacak.';
    }
  }

  Widget _scheduleChip(String value, String label, IconData icon) {
    final active = _scheduleFlexibility == value;
    return GestureDetector(
      onTap: () => _applyScheduleFlexibility(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: active ? AppColors.primary : AppColors.border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon,
              size: 16,
              color: active ? Colors.white : AppColors.textPrimary),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : AppColors.textPrimary)),
        ]),
      ),
    );
  }

  // Phase 284 — eski _buildStep3Body schedule chips bölümü Adım 1'e taşındı.
  Widget _buildScheduleFlexSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Saat dilimi esnekliği',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 4),
        Text(
          'Ustanın seninle saatte uyuşma esnekliği. Esnek → ustaya zaman kalır; '
          'belirli → seçtiğin tarih/saat; acil → aynı gün.',
          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _scheduleChip('flexible', 'Esnek', Icons.event_available_rounded),
            _scheduleChip('specific', 'Belirli', Icons.schedule_rounded),
            _scheduleChip('urgent',   'Acil',    Icons.bolt_rounded),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: _scheduleFlexibility == 'specific' &&
                    (_dueDate == null || _dueTime == null)
                ? AppColors.error.withValues(alpha: 0.08)
                : AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            _scheduleSummary(),
            style: TextStyle(
              fontSize: 12,
              color: _scheduleFlexibility == 'specific' &&
                      (_dueDate == null || _dueTime == null)
                  ? AppColors.error
                  : AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  // Phase 284 — Yeni Adım 2: yalnızca Foto/Video + Konum (+ şablon kaydet).
  Widget _buildStep2Body() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Fotoğraf & Video',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        JobPhotoPicker(
          initialFiles: _selectedPhotos,
          onChanged: (files) => setState(() => _selectedPhotos = files),
        ),
        const SizedBox(height: 15),
        const Divider(height: 1),
        const SizedBox(height: 12),
        Row(
          children: [
            Text(AppLocalizations.of(context).postJobLocation,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
            const SizedBox(width: 4),
            const Text('*',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error)),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          'Doğru ustaya hızlı ulaşmak için konum zorunlu — harita pin\'i veya "Konumumu Kullan".',
          style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: TextFormField(
                controller: _locationController,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: AppLocalizations.of(context).postJobLocation,
                  prefixIcon: const Icon(Icons.location_on),
                  hintText: AppLocalizations.of(context).postJobLocationHint,
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
        const SizedBox(height: 12),
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
      'location': _locationController.text,
      'budgetMin': double.tryParse(_budgetController.text) ?? 0,
      'category': _selectedCategory,
      // Phase 152 — Konum zorunlu (step3'te garantilendi).
      'latitude': _lat,
      'longitude': _lng,
      // Yeni ilanlar her zaman net pin'le geliyor → backfill bayrağı false.
      'locationApprox': false,
      'locationSource': 'user-pin',
      // Phase Two-Sided — request/offer ayraç
      'kind': widget.kind,
      if (_uploadedPhotoUrls.isNotEmpty) 'photos': _uploadedPhotoUrls,
      if (_uploadedVideoUrls.isNotEmpty) 'videos': _uploadedVideoUrls,
      if (_dueDate != null)
        'dueDate':
            '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}',
      // Phase 266 — saat (HH:MM) + "tüm saatler" toggle
      if (!_anyTime && _dueTime != null)
        'dueTime':
            '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}',
      'dueAnyTime': _anyTime,
      // Phase 265 — özel ilan hedef ustası (backend kredi düşer).
      if (widget.targetWorkerId != null)
        'targetWorkerId': widget.targetWorkerId,
      // Phase 265 — saat dilimi esnekliği
      'scheduleFlexibility': _scheduleFlexibility,
    };

    try {
      await ref.read(jobsProvider.notifier).addJob(jobData);
      // Phase 282 — yeni ilan eklendikten sonra "İşlerim" sekmesindeki
      // myJobsProvider cache'ini de invalide et; yoksa kullanıcı taze
      // ilanı orada görmek için uygulamayı kapatıp açmak zorunda kalır.
      final auth = ref.read(authStateProvider);
      if (auth is AuthAuthenticated) {
        final userId = auth.user['id'] as String?;
        if (userId != null) ref.invalidate(myJobsProvider(userId));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('İlan kaydedilemedi: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: AppColors.error,
        ));
        setState(() => _uploading = false);
      }
      return;
    }
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
