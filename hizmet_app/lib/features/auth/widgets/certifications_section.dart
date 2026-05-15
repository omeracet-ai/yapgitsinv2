import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../certifications/data/firebase_certification_repository.dart';

/// Phase 159 — EditProfile worker certifications section.
class CertificationsSection extends ConsumerStatefulWidget {
  const CertificationsSection({super.key});

  @override
  ConsumerState<CertificationsSection> createState() =>
      _CertificationsSectionState();
}

class _CertificationsSectionState
    extends ConsumerState<CertificationsSection> {
  List<WorkerCertification> _items = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(firebaseCertificationRepositoryProvider);
    final list = await repo.listMine();
    if (!mounted) return;
    setState(() {
      _items = list;
      _loading = false;
    });
  }

  Future<void> _delete(String id) async {
    final repo = ref.read(firebaseCertificationRepositoryProvider);
    try {
      await repo.remove(id);
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silinemedi')),
      );
    }
  }

  Future<void> _openAddSheet() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _AddCertificationSheet(),
    );
    if (added == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Doğrulanmış sertifikalar profilinizde "Sertifikalı" rozeti olarak görünür.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),
        if (_loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Henüz sertifika eklemediniz.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          )
        else
          Column(children: _items.map(_certTile).toList()),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: _openAddSheet,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Sertifika Ekle'),
          ),
        ),
      ],
    );
  }

  Widget _certTile(WorkerCertification c) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Text(c.verified ? '🪪' : '📜',
              style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.name,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(c.issuer,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 2),
                Row(children: [
                  if (c.verified)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('Doğrulandı',
                          style: TextStyle(
                              fontSize: 10,
                              color: AppColors.success,
                              fontWeight: FontWeight.w600)),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('Beklemede',
                          style: TextStyle(
                              fontSize: 10,
                              color: AppColors.accent,
                              fontWeight: FontWeight.w600)),
                    ),
                ]),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline,
                color: AppColors.error, size: 20),
            onPressed: () => _delete(c.id),
          ),
        ],
      ),
    );
  }
}

class _AddCertificationSheet extends ConsumerStatefulWidget {
  const _AddCertificationSheet();
  @override
  ConsumerState<_AddCertificationSheet> createState() =>
      _AddCertificationSheetState();
}

class _AddCertificationSheetState
    extends ConsumerState<_AddCertificationSheet> {
  final _name = TextEditingController();
  final _issuer = TextEditingController();
  DateTime? _issuedAt;
  DateTime? _expiresAt;
  String? _docUrl;
  String? _docName;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _issuer.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool issued) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: issued ? now : DateTime(now.year + 1, now.month, now.day),
      firstDate: DateTime(1990),
      lastDate: DateTime(now.year + 30),
    );
    if (picked != null) {
      setState(() {
        if (issued) {
          _issuedAt = picked;
        } else {
          _expiresAt = picked;
        }
      });
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png'],
    );
    final path = result?.files.single.path;
    if (path == null) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(firebaseCertificationRepositoryProvider);
      final url = await repo.uploadDocument(XFile(path));
      setState(() {
        _docUrl = url;
        _docName = result?.files.single.name;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dosya yüklenemedi')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final issuer = _issuer.text.trim();
    if (name.isEmpty || issuer.isEmpty || _issuedAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ad, kurum ve veriliş tarihi gerekli')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(firebaseCertificationRepositoryProvider);
      await repo.create(
        name: name,
        issuer: issuer,
        issuedAt: _issuedAt!,
        expiresAt: _expiresAt,
        documentUrl: _docUrl,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kaydedilemedi')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _fmt(DateTime? d) =>
      d == null ? 'Seçilmedi' : '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Sertifika Ekle',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(
                labelText: 'Sertifika Adı', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _issuer,
            decoration: const InputDecoration(
                labelText: 'Veren Kurum', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => _pickDate(true),
                child: Text('Veriliş: ${_fmt(_issuedAt)}'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => _pickDate(false),
                child: Text('Geçerlilik: ${_fmt(_expiresAt)}'),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy ? null : _pickFile,
            icon: const Icon(Icons.attach_file),
            label: Text(_docName ?? 'Doküman Yükle (pdf/jpg/png)'),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _busy ? null : _save,
            child: _busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Kaydet'),
          ),
        ],
      ),
    );
  }
}
