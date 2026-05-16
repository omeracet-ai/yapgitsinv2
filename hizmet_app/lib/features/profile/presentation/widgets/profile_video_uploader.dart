import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/services/secure_token_store.dart';

/// ProfileVideoUploader — profil videosu yükler
/// Tek video seçer, API'ye POST eder, başarı sonrası temizlenir
class ProfileVideoUploader extends StatefulWidget {
  final VoidCallback? onUploadSuccess;

  const ProfileVideoUploader({
    super.key,
    this.onUploadSuccess,
  });

  @override
  State<ProfileVideoUploader> createState() => _ProfileVideoUploaderState();
}

class _ProfileVideoUploaderState extends State<ProfileVideoUploader> {
  final ImagePicker _picker = ImagePicker();
  final Dio _dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));

  XFile? _selectedVideo;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String? _errorMessage;

  Future<void> _pickVideo() async {
    try {
      setState(() => _errorMessage = null);

      final xFile = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5),
      );

      if (xFile == null) return;

      // XFile.length() web-safe; dart:io File kullanmıyoruz.
      final sizeBytes = await xFile.length();
      final sizeInMB = sizeBytes / (1024 * 1024);

      // Max 50MB
      if (sizeInMB > 50) {
        setState(() => _errorMessage = 'Video boyutu 50MB\'dan küçük olmalı');
        return;
      }

      setState(() => _selectedVideo = xFile);
    } catch (e) {
      setState(() => _errorMessage = 'Video seçme hatası: $e');
    }
  }

  Future<void> _uploadVideo() async {
    if (_selectedVideo == null) return;

    try {
      setState(() {
        _isUploading = true;
        _errorMessage = null;
        _uploadProgress = 0.0;
      });

      // Phase 244 — JWT token'ı SecureTokenStore'dan al.
      final token = await SecureTokenStore().readToken();

      if (token == null || token.isEmpty) {
        setState(() {
          _isUploading = false;
          _errorMessage = 'Oturum süresi doldu. Lütfen giriş yapın.';
        });
        return;
      }

      // MultipartFile — fromBytes kullan (web + mobil uyumlu, dart:io gerektirmez)
      final filename = _selectedVideo!.name.isNotEmpty
          ? _selectedVideo!.name
          : _selectedVideo!.path.split('/').last;
      final bytes = await _selectedVideo!.readAsBytes();
      final multipartFile = MultipartFile.fromBytes(bytes, filename: filename);

      // FormData oluştur
      final formData = FormData.fromMap({
        'video': multipartFile,
      });

      // Upload yap
      final response = await _dio.post(
        '/uploads/profile-video',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          validateStatus: (status) => status != null && status < 500,
        ),
        onSendProgress: (sent, total) {
          setState(() {
            _uploadProgress = total > 0 ? sent / total : 0.0;
          });
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Başarılı
        setState(() {
          _selectedVideo = null;
          _isUploading = false;
          _uploadProgress = 0.0;
        });

        widget.onUploadSuccess?.call();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Video başarıyla yüklendi'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else if (response.statusCode == 413) {
        setState(() {
          _isUploading = false;
          _errorMessage = 'Dosya çok büyük (max 50MB)';
        });
      } else if (response.statusCode == 401) {
        setState(() {
          _isUploading = false;
          _errorMessage = 'Oturum süresi doldu. Lütfen giriş yapın.';
        });
      } else {
        final errorMsg = response.data?['message'] ?? 'Yükleme başarısız';
        setState(() {
          _isUploading = false;
          _errorMessage = errorMsg;
        });
      }
    } catch (e) {
      setState(() {
        _isUploading = false;
        _errorMessage = 'Yükleme hatası: $e';
      });
    }
  }

  void _clearSelection() {
    setState(() {
      _selectedVideo = null;
      _errorMessage = null;
      _uploadProgress = 0.0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.videocam, color: AppColors.primary, size: 20),
              SizedBox(width: 8),
              Text(
                'Profil Videosu',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Hizmetlerinizi tanıtan kısa bir video ekleyin',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 14),
          if (_selectedVideo != null) ...[
            _buildSelectedVideoView(),
          ] else ...[
            _buildPickerButton(),
          ],
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPickerButton() {
    return GestureDetector(
      onTap: _isUploading ? null : _pickVideo,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.3),
            width: 2,
          ),
          borderRadius: BorderRadius.circular(12),
          color: AppColors.primary.withValues(alpha: 0.05),
        ),
        child: const Column(
          children: [
            Icon(
              Icons.cloud_upload_outlined,
              size: 40,
              color: AppColors.primary,
            ),
            SizedBox(height: 12),
            Text(
              'Video Seç',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'mp4, mov, avi, mpeg • Max 50MB',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedVideoView() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 2,
        ),
        borderRadius: BorderRadius.circular(12),
        color: AppColors.primary.withValues(alpha: 0.05),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: AppColors.success),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _selectedVideo!.name.isNotEmpty
                          ? _selectedVideo!.name
                          : _selectedVideo!.path.split('/').last,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    FutureBuilder<int>(
                      future: _selectedVideo!.length(),
                      builder: (ctx, snap) => Text(
                        snap.hasData
                            ? '${(snap.data! / (1024 * 1024)).toStringAsFixed(1)} MB'
                            : '...',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (!_isUploading)
                GestureDetector(
                  onTap: _clearSelection,
                  child: const Icon(Icons.close, color: AppColors.textSecondary),
                ),
            ],
          ),
          if (_isUploading) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _uploadProgress,
                minHeight: 4,
                backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${(_uploadProgress * 100).toStringAsFixed(0)}% yükleniyor',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ] else ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _uploadVideo,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Yükle'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
