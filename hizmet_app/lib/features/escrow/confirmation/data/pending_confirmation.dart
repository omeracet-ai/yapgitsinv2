/// Phase 271 — "İşlerim → Bekleyen Onaylar" payload.
///
/// Backend: GET /escrow/confirmation/my-pending
class PendingConfirmation {
  final String escrowId;
  final String bookingId;
  final String? jobId;
  final String? jobTitle;
  final String counterpartyId;
  final String counterpartyName;
  final String? counterpartyImage;
  final double amount;
  // 'awaiting_confirmation' | 'pending_grace'
  final String confirmationStatus;
  final DateTime? graceEndsAt;
  // 'customer' | 'worker'
  final String mySide;
  final bool myConfirmed;

  const PendingConfirmation({
    required this.escrowId,
    required this.bookingId,
    required this.jobId,
    required this.jobTitle,
    required this.counterpartyId,
    required this.counterpartyName,
    required this.counterpartyImage,
    required this.amount,
    required this.confirmationStatus,
    required this.graceEndsAt,
    required this.mySide,
    required this.myConfirmed,
  });

  bool get isPendingGrace => confirmationStatus == 'pending_grace';
  bool get isAwaiting => confirmationStatus == 'awaiting_confirmation';

  factory PendingConfirmation.fromJson(Map<String, dynamic> j) {
    final cp = j['counterparty'] is Map
        ? Map<String, dynamic>.from(j['counterparty'] as Map)
        : const <String, dynamic>{};
    DateTime? p(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString());
    return PendingConfirmation(
      escrowId: j['escrowId']?.toString() ?? '',
      bookingId: j['bookingId']?.toString() ?? '',
      jobId: j['jobId']?.toString(),
      jobTitle: j['jobTitle']?.toString(),
      counterpartyId: cp['id']?.toString() ?? '',
      counterpartyName: cp['fullName']?.toString() ?? 'Bilinmeyen',
      counterpartyImage: cp['profileImageUrl']?.toString(),
      amount: (j['amount'] as num?)?.toDouble() ?? 0.0,
      confirmationStatus:
          j['confirmationStatus']?.toString() ?? 'awaiting_confirmation',
      graceEndsAt: p(j['graceEndsAt']),
      mySide: j['mySide']?.toString() ?? 'customer',
      myConfirmed: j['myConfirmed'] == true,
    );
  }
}
