enum WithdrawalStatus { pending, approved, rejected, completed }

WithdrawalStatus _parseStatus(String? s) {
  switch (s) {
    case 'approved':
      return WithdrawalStatus.approved;
    case 'rejected':
      return WithdrawalStatus.rejected;
    case 'completed':
      return WithdrawalStatus.completed;
    case 'pending':
    default:
      return WithdrawalStatus.pending;
  }
}

class WithdrawalRequestModel {
  final String id;
  final String workerId;
  final int amountMinor;
  final String iban;
  final String accountHolderName;
  final WithdrawalStatus status;
  final DateTime requestedAt;
  final DateTime? processedAt;
  final String? adminNote;
  final String? workerNote;

  WithdrawalRequestModel({
    required this.id,
    required this.workerId,
    required this.amountMinor,
    required this.iban,
    required this.accountHolderName,
    required this.status,
    required this.requestedAt,
    this.processedAt,
    this.adminNote,
    this.workerNote,
  });

  double get amountTL => amountMinor / 100.0;

  factory WithdrawalRequestModel.fromJson(Map<String, dynamic> j) =>
      WithdrawalRequestModel(
        id: (j['id'] as String?) ?? '',
        workerId: (j['workerId'] as String?) ?? '',
        amountMinor: ((j['amountMinor'] as num?) ?? 0).toInt(),
        iban: (j['iban'] as String?) ?? '',
        accountHolderName: (j['accountHolderName'] as String?) ?? '',
        status: _parseStatus(j['status'] as String?),
        requestedAt:
            DateTime.tryParse((j['requestedAt'] as String?) ?? '') ??
                DateTime.now(),
        processedAt: j['processedAt'] != null
            ? DateTime.tryParse(j['processedAt'] as String)
            : null,
        adminNote: j['adminNote'] as String?,
        workerNote: j['workerNote'] as String?,
      );
}
