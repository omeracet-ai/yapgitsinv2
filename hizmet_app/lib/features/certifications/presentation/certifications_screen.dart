import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../data/firebase_certification_repository.dart';
import '../../../../core/theme/app_colors.dart';

class CertificationsScreen extends ConsumerStatefulWidget {
  const CertificationsScreen({super.key});

  @override
  ConsumerState<CertificationsScreen> createState() =>
      _CertificationsScreenState();
}

class _CertificationsScreenState extends ConsumerState<CertificationsScreen> {
  List<WorkerCertification> _certs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final repo = ref.read(firebaseCertificationRepositoryProvider);
      final list = await repo.listMine();
      setState(() => _certs = list);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addCertification() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _AddCertSheet(onAdded: _load),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Sertifikalarım'),
        backgroundColor: AppColors.primary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addCertification,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add),
        label: const Text('Sertifika Ekle'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!,
                        style: const TextStyle(color: Colors.red),
                        textAlign: TextAlign.center),
                  ),
                )
              : _certs.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('📜', style: TextStyle(fontSize: 48)),
                          SizedBox(height: 16),
                          Text('Henüz sertifikanız yok.',
                              style: TextStyle(
                                  fontSize: 16, color: AppColors.textSecondary)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _certs.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final c = _certs[i];
                        return Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 10),
                            leading: const Text('🪪',
                                style: TextStyle(fontSize: 28)),
                            title: Text(c.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              '${c.issuer}\n${_fmtDate(c.issuedAt)}'
                              '${c.expiresAt != null ? ' – ${_fmtDate(c.expiresAt!)}' : ' · Süresiz'}',
                              style: const TextStyle(fontSize: 12),
                            ),
                            isThreeLine: true,
                            trailing: c.verified
                                ? Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF4CAF50)
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text('Onaylı',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: Color(0xFF2E7D32),
                                            fontWeight: FontWeight.w600)),
                                  )
                                : Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text('Bekliyor',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.orange,
                                            fontWeight: FontWeight.w600)),
                                  ),
                          ),
                        );
                      },
                    ),
    );
  }
}

// ── Add Certification Sheet ──────────────────────────────────────────────────
class _AddCertSheet extends ConsumerStatefulWidget {
  final VoidCallback onAdded;
  const _AddCertSheet({required this.onAdded});

  @override
  ConsumerState<_AddCertSheet> createState() => _AddCertSheetState();
}

class _AddCertSheetState extends ConsumerState<_AddCertSheet> {
  final _nameCtrl = TextEditingController();
  final _issuerCtrl = TextEditingController();
  DateTime _issuedAt = DateTime.now();
  DateTime? _expiresAt;
  XFile? _docFile;
  bool _uploading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _issuerCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDoc() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file != null) setState(() => _docFile = file);
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final issuer = _issuerCtrl.text.trim();
    if (name.isEmpty || issuer.isEmpty) {
      setState(() => _error = 'Ad ve kurum zorunludur.');
      return;
    }
    setState(() { _uploading = true; _error = null; });
    try {
      final repo = ref.read(firebaseCertificationRepositoryProvider);
      String? docUrl;
      if (_docFile != null) {
        docUrl = await repo.uploadDocument(_docFile!);
      }
      await repo.create(
        name: name,
        issuer: issuer,
        issuedAt: _issuedAt,
        expiresAt: _expiresAt,
        documentUrl: docUrl,
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onAdded();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _pickDate({required bool isExpiry}) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isExpiry ? (now.add(const Duration(days: 365))) : now,
      firstDate: DateTime(2000),
      lastDate: DateTime(2040),
    );
    if (picked != null) {
      setState(() {
        if (isExpiry) {
          _expiresAt = picked;
        } else {
          _issuedAt = picked;
        }
      });
    }
  }

  String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Sertifika Ekle',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Sertifika Adı *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _issuerCtrl,
              decoration: const InputDecoration(
                labelText: 'Veren Kurum *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _pickDate(isExpiry: false),
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text('Veriliş: ${_fmt(_issuedAt)}'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _pickDate(isExpiry: true),
              icon: const Icon(Icons.event_available, size: 16),
              label: Text(_expiresAt != null
                  ? 'Geçerlilik: ${_fmt(_expiresAt!)}'
                  : 'Geçerlilik tarihi ekle (opsiyonel)'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDoc,
              icon: const Icon(Icons.attach_file, size: 16),
              label: Text(_docFile != null
                  ? _docFile!.name
                  : 'Belge Yükle (pdf/jpg/png)'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _uploading ? null : _submit,
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14)),
                child: _uploading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Kaydet',
                        style: TextStyle(color: Colors.white, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
