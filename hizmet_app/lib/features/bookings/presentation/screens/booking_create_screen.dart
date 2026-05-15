import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../calendar/data/firebase_booking_repository.dart';
import '../../widgets/booking_step1_service.dart';
import '../../widgets/booking_step2_datetime.dart';
import '../../widgets/booking_step3_address.dart';

class BookingCreateScreen extends ConsumerStatefulWidget {
  final String workerId;
  final String workerName;
  final List<String> workerCategories;

  const BookingCreateScreen({
    super.key,
    required this.workerId,
    required this.workerName,
    required this.workerCategories,
  });

  @override
  ConsumerState<BookingCreateScreen> createState() => _BookingCreateScreenState();
}

class _BookingCreateScreenState extends ConsumerState<BookingCreateScreen> {
  int _step = 0;
  String? _category;
  String _subCategory = '';
  String _description = '';
  DateTime? _date;
  TimeOfDay? _time;
  String _address = '';
  String _customerNote = '';
  String _agreedPrice = '';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.workerCategories.length == 1) {
      _category = widget.workerCategories.first;
    }
  }

  bool get _step1Valid =>
      _category != null && _category!.isNotEmpty && _description.trim().length >= 5;
  bool get _step2Valid => _date != null;
  bool get _step3Valid => _address.trim().length >= 3;

  bool get _canNext => switch (_step) {
        0 => _step1Valid,
        1 => _step2Valid,
        2 => _step3Valid,
        _ => false,
      };

  String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (!_step3Valid || _submitting) return;
    setState(() => _submitting = true);
    try {
      final repo = ref.read(firebaseBookingRepositoryProvider);
      await repo.createBooking(
        workerId: widget.workerId,
        category: _category!,
        subCategory: _subCategory.trim().isEmpty ? null : _subCategory.trim(),
        description: _description.trim(),
        address: _address.trim(),
        scheduledDate: _ymd(_date!),
        scheduledTime: _time == null
            ? null
            : '${_time!.hour.toString().padLeft(2, '0')}:${_time!.minute.toString().padLeft(2, '0')}',
        agreedPrice: _agreedPrice.trim().isEmpty
            ? null
            : double.tryParse(_agreedPrice.trim()),
        customerNote: _customerNote.trim().isEmpty ? null : _customerNote.trim(),
      );
      ref.invalidate(myCustomerBookingsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Randevu oluşturuldu'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Randevu — ${widget.workerName}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step == 0) {
              Navigator.of(context).pop();
            } else {
              setState(() => _step--);
            }
          },
        ),
      ),
      body: Column(
        children: [
          _ProgressBar(step: _step, total: 3),
          Expanded(
            child: IndexedStack(
              index: _step,
              children: [
                BookingStep1Service(
                  categories: widget.workerCategories,
                  selectedCategory: _category,
                  subCategory: _subCategory,
                  description: _description,
                  onCategoryChanged: (v) => setState(() => _category = v),
                  onSubCategoryChanged: (v) => _subCategory = v,
                  onDescriptionChanged: (v) => setState(() => _description = v),
                ),
                BookingStep2DateTime(
                  workerId: widget.workerId,
                  scheduledDate: _date,
                  scheduledTime: _time,
                  onDateChanged: (d) => setState(() => _date = d),
                  onTimeChanged: (t) => setState(() => _time = t),
                ),
                BookingStep3Address(
                  address: _address,
                  customerNote: _customerNote,
                  agreedPrice: _agreedPrice,
                  onAddressChanged: (v) => setState(() => _address = v),
                  onNoteChanged: (v) => _customerNote = v,
                  onPriceChanged: (v) => _agreedPrice = v,
                  workerName: widget.workerName,
                  category: _category,
                  subCategory: _subCategory,
                  date: _date,
                  time: _time,
                ),
              ],
            ),
          ),
          _StickyBar(
            step: _step,
            canNext: _canNext,
            submitting: _submitting,
            onBack: _step == 0 ? null : () => setState(() => _step--),
            onNext: () {
              if (_step < 2) {
                if (_canNext) setState(() => _step++);
              } else {
                _submit();
              }
            },
          ),
        ],
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  final int step;
  final int total;
  const _ProgressBar({required this.step, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: List.generate(total, (i) {
          final active = i <= step;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i == total - 1 ? 0 : 6),
              height: 4,
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _StickyBar extends StatelessWidget {
  final int step;
  final bool canNext;
  final bool submitting;
  final VoidCallback? onBack;
  final VoidCallback onNext;
  const _StickyBar({
    required this.step,
    required this.canNext,
    required this.submitting,
    required this.onBack,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: EdgeInsets.fromLTRB(
          16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
      child: Row(
        children: [
          if (onBack != null)
            Expanded(
              child: OutlinedButton(
                onPressed: submitting ? null : onBack,
                child: const Text('Geri'),
              ),
            ),
          if (onBack != null) const SizedBox(width: 12),
          Expanded(
            flex: onBack == null ? 1 : 2,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: (canNext && !submitting) ? onNext : null,
              child: submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : Text(step == 2 ? 'Randevu Al' : 'Devam'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Helper to push the booking screen from anywhere.
Future<void> openBookingCreate(
  BuildContext context, {
  required String workerId,
  required String workerName,
  required List<String> workerCategories,
}) {
  return Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => BookingCreateScreen(
        workerId: workerId,
        workerName: workerName,
        workerCategories: workerCategories,
      ),
    ),
  );
}

/// Router-friendly factory.
Widget buildBookingCreateRoute(GoRouterState state) {
  final extra = state.extra as Map<String, dynamic>? ?? const {};
  final cats = (extra['workerCategories'] as List?)?.cast<String>() ?? const <String>[];
  return BookingCreateScreen(
    workerId: state.pathParameters['workerId']!,
    workerName: extra['workerName'] as String? ?? 'Usta',
    workerCategories: cats,
  );
}
