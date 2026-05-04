import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/success_screen.dart';
import '../../../../core/widgets/location_picker.dart';
import '../../../../core/providers/navigation_provider.dart';
import '../providers/job_provider.dart';
import '../../../categories/data/category_repository.dart';
import '../../../photos/data/photo_repository.dart';
import '../../../photos/presentation/widgets/job_photo_picker.dart';

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

  String? _selectedCategory;
  int _currentStep = 0;
  double? _lat;
  double? _lng;

  // Fotoğraf adımı için
  List<File> _selectedPhotos = [];
  List<String> _uploadedPhotoUrls = [];
  bool _uploading = false;

  static const int _requiredPhotoCount = 3;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _locationController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('İş İlanı Ver'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
      // Fotoğraf adımı: 3 fotoğraf zorunlu
      if (_selectedPhotos.length < _requiredPhotoCount) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
              '$_requiredPhotoCount fotoğraf eklemelisiniz (${_selectedPhotos.length}/$_requiredPhotoCount)'),
          backgroundColor: Colors.orange,
        ));
        return;
      }
      // Yükle
      setState(() => _uploading = true);
      try {
        final urls = await ref
            .read(photoRepositoryProvider)
            .uploadJobPhotos(_selectedPhotos);
        _uploadedPhotoUrls = urls;
        if (mounted) setState(() => _currentStep++);
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
                onTap: () => setState(() => _selectedCategory = name),
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

  Widget _buildDetailsStep() {
    return Column(
      children: [
        TextFormField(
          controller: _titleController,
          decoration: const InputDecoration(
              labelText: 'İş Başlığı',
              hintText: 'Örn: 3+1 Daire Boyatma'),
          validator: (v) =>
              v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _descController,
          maxLines: 3,
          decoration:
              const InputDecoration(labelText: 'Açıklama'),
          validator: (v) =>
              v?.isEmpty ?? true ? 'Boş bırakılamaz' : null,
        ),
      ],
    );
  }

  Widget _buildPhotosStep() {
    return JobPhotoPicker(
      initialFiles: _selectedPhotos,
      requiredCount: _requiredPhotoCount,
      onChanged: (files) => setState(() => _selectedPhotos = files),
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
    };

    await ref.read(jobsProvider.notifier).addJob(jobData);

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => SuccessScreen(
            title: 'İlanınız Yayında!',
            message:
                'İlanınız başarıyla yayınlandı. Şimdi ustalardan teklif bekleyebilirsiniz.',
            btnText: 'Keşfet\'e Dön',
            onBtnPressed: () {
              ref.read(selectedTabProvider.notifier).state = 0;
              context.go('/');
            },
          ),
        ),
      );
    }
  }
}
