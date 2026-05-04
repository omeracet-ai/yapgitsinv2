import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../categories/data/category_repository.dart';
import '../../data/service_request_repository.dart';

class PostServiceRequestScreen extends ConsumerStatefulWidget {
  const PostServiceRequestScreen({super.key});

  @override
  ConsumerState<PostServiceRequestScreen> createState() =>
      _PostServiceRequestScreenState();
}

class _PostServiceRequestScreenState
    extends ConsumerState<PostServiceRequestScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();

  String? _selectedCategory;
  String? _selectedCategoryId;
  File? _image;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
      maxWidth: 1280,
    );
    if (picked != null) setState(() => _image = File(picked.path));
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final desc = _descCtrl.text.trim();
    final location = _locationCtrl.text.trim();

    if (_selectedCategory == null ||
        title.isEmpty ||
        desc.isEmpty ||
        location.isEmpty) {
      setState(
          () => _error = 'Kategori, başlık, açıklama ve konum zorunludur.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      String? imageUrl;
      if (_image != null) {
        imageUrl = await repo.uploadJobPhoto(_image!);
      }

      await repo.create(
        title: title,
        description: desc,
        category: _selectedCategory!,
        categoryId: _selectedCategoryId,
        location: location,
        address: _addressCtrl.text.trim(),
        imageUrl: imageUrl,
      );

      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Hizmet Al İlanı Ver',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Kategori
              categoriesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
                data: (cats) => DropdownButtonFormField<String>(
                  initialValue: _selectedCategory,
                  decoration: const InputDecoration(
                    labelText: 'Kategori *',
                    prefixIcon: Icon(Icons.category_outlined),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  items: cats.map((c) {
                    final name = c['name']?.toString() ?? '';
                    return DropdownMenuItem(value: name, child: Text(name));
                  }).toList(),
                  onChanged: (v) {
                    final cat = cats.firstWhere((c) => c['name'] == v,
                        orElse: () => {});
                    setState(() {
                      _selectedCategory = v;
                      _selectedCategoryId = cat['id']?.toString();
                    });
                  },
                ),
              ),
              const SizedBox(height: 14),

              // Başlık
              TextField(
                controller: _titleCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Başlık *',
                  prefixIcon: Icon(Icons.title),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
              const SizedBox(height: 14),

              // Açıklama
              TextField(
                controller: _descCtrl,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Açıklama *',
                  prefixIcon: Icon(Icons.description_outlined),
                  alignLabelWithHint: true,
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
              const SizedBox(height: 14),

              // Konum
              TextField(
                controller: _locationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Konum / Şehir *',
                  prefixIcon: Icon(Icons.location_on_outlined),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
              const SizedBox(height: 14),

              // Adres
              TextField(
                controller: _addressCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Detaylı Adres (opsiyonel)',
                  prefixIcon: Icon(Icons.map_outlined),
                  alignLabelWithHint: true,
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
              const SizedBox(height: 16),

              // Fotoğraf
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 140,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: _image != null
                            ? AppColors.primary
                            : AppColors.border,
                        width: _image != null ? 1.5 : 1),
                  ),
                  child: _image != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.file(_image!,
                              fit: BoxFit.cover, width: double.infinity),
                        )
                      : const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate_outlined,
                                size: 40, color: AppColors.textHint),
                            SizedBox(height: 8),
                            Text('Fotoğraf Ekle (opsiyonel)',
                                style: TextStyle(color: AppColors.textHint)),
                          ],
                        ),
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red.shade200)),
                  child: Text(_error!,
                      style:
                          TextStyle(color: Colors.red.shade700, fontSize: 13)),
                ),
              ],

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('İlanı Yayınla',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
