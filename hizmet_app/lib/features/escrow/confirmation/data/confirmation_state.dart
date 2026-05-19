/// Phase 254 — Escrow confirmation flow models.
///
/// Tier kuralları:
///   - lite     (< 500 TL): yalnız QR scan + onay
///   - standard (500–5000): QR + before/after foto her taraftan + GPS match
///   - premium  (>= 5000):  standard + opsiyonel video
class ConfirmationTier {
  static const lite = 'lite';
  static const standard = 'standard';
  static const premium = 'premium';
}

class ConfirmationPhase {
  static const before = 'before';
  static const after = 'after';
}

class ConfirmationSide {
  static const worker = 'worker';
  static const customer = 'customer';
}

class ConfirmationRequirements {
  final int photosPerPhase;
  final bool videoRequired;
  final bool gpsMatchRequired;

  const ConfirmationRequirements({
    required this.photosPerPhase,
    required this.videoRequired,
    required this.gpsMatchRequired,
  });

  factory ConfirmationRequirements.fromJson(Map<String, dynamic> j) {
    return ConfirmationRequirements(
      photosPerPhase: (j['photosPerPhase'] as num?)?.toInt() ?? 0,
      videoRequired: j['videoRequired'] == true,
      gpsMatchRequired: j['gpsMatchRequired'] == true,
    );
  }
}

class PhotoEntry {
  final String id;
  final String url;
  final String phase; // before | after
  final String side;  // worker | customer

  PhotoEntry({
    required this.id,
    required this.url,
    required this.phase,
    required this.side,
  });

  factory PhotoEntry.fromJson(Map<String, dynamic> j) => PhotoEntry(
        id: j['id']?.toString() ?? '',
        url: j['url']?.toString() ?? '',
        phase: j['phase']?.toString() ?? '',
        side: j['side']?.toString() ?? '',
      );
}

/// Karşılıklı foto haritası: { worker:{ before:[...], after:[...] }, customer:{...} }
class SidePhotos {
  final List<PhotoEntry> before;
  final List<PhotoEntry> after;
  const SidePhotos({this.before = const [], this.after = const []});

  factory SidePhotos.fromJson(Map<String, dynamic>? j) {
    if (j == null) return const SidePhotos();
    List<PhotoEntry> parse(dynamic v) {
      if (v is! List) return const [];
      return v
          .map((e) => PhotoEntry.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }

    return SidePhotos(
      before: parse(j['before']),
      after: parse(j['after']),
    );
  }
}

class ConfirmationState {
  final String tier;
  final DateTime? deadline;
  final DateTime? qrScannedAt;
  final SidePhotos workerPhotos;
  final SidePhotos customerPhotos;
  final String? videoUrl;
  final DateTime? workerConfirmedAt;
  final DateTime? customerConfirmedAt;
  final bool allConditionsMet;
  final ConfirmationRequirements requirements;
  final String? escrowStatus;
  final bool escrowReleased;

  bool get qrScanned => qrScannedAt != null;
  bool get workerConfirmed => workerConfirmedAt != null;
  bool get customerConfirmed => customerConfirmedAt != null;

  const ConfirmationState({
    required this.tier,
    this.deadline,
    this.qrScannedAt,
    this.workerPhotos = const SidePhotos(),
    this.customerPhotos = const SidePhotos(),
    this.videoUrl,
    this.workerConfirmedAt,
    this.customerConfirmedAt,
    this.allConditionsMet = false,
    required this.requirements,
    this.escrowStatus,
    this.escrowReleased = false,
  });

  factory ConfirmationState.fromJson(Map<String, dynamic> j) {
    DateTime? p(dynamic v) =>
        v == null ? null : DateTime.tryParse(v.toString());
    final photos = j['photos'] is Map
        ? Map<String, dynamic>.from(j['photos'] as Map)
        : const <String, dynamic>{};
    return ConfirmationState(
      tier: j['tier']?.toString() ?? ConfirmationTier.lite,
      deadline: p(j['deadline']),
      qrScannedAt: p(j['qrScannedAt']),
      workerPhotos: SidePhotos.fromJson(
          photos['worker'] is Map
              ? Map<String, dynamic>.from(photos['worker'] as Map)
              : null),
      customerPhotos: SidePhotos.fromJson(
          photos['customer'] is Map
              ? Map<String, dynamic>.from(photos['customer'] as Map)
              : null),
      videoUrl: j['videoUrl']?.toString(),
      workerConfirmedAt: p(j['workerConfirmedAt']),
      customerConfirmedAt: p(j['customerConfirmedAt']),
      allConditionsMet: j['allConditionsMet'] == true,
      requirements: j['requirements'] is Map
          ? ConfirmationRequirements.fromJson(
              Map<String, dynamic>.from(j['requirements'] as Map))
          : const ConfirmationRequirements(
              photosPerPhase: 0,
              videoRequired: false,
              gpsMatchRequired: false,
            ),
      escrowStatus: j['escrowStatus']?.toString(),
      escrowReleased: j['escrowReleased'] == true,
    );
  }

  /// Side için before+after foto tamam mı?
  bool photosCompleteFor(String side) {
    final req = requirements.photosPerPhase;
    if (req <= 0) return true;
    final p = side == ConfirmationSide.worker ? workerPhotos : customerPhotos;
    return p.before.length >= req && p.after.length >= req;
  }
}

class QrToken {
  final String qrToken;
  final DateTime expiresAt;
  final String tier;
  final ConfirmationRequirements? requirements;

  QrToken({
    required this.qrToken,
    required this.expiresAt,
    required this.tier,
    this.requirements,
  });

  factory QrToken.fromJson(Map<String, dynamic> j) {
    return QrToken(
      qrToken: j['qrToken']?.toString() ?? '',
      expiresAt: DateTime.tryParse(j['expiresAt']?.toString() ?? '') ??
          DateTime.now().add(const Duration(minutes: 5)),
      tier: j['tier']?.toString() ?? ConfirmationTier.lite,
      requirements: j['requirements'] is Map
          ? ConfirmationRequirements.fromJson(
              Map<String, dynamic>.from(j['requirements'] as Map))
          : null,
    );
  }
}

class ScanResult {
  final bool ok;
  final bool gpsMatch;
  final double? distanceM;

  ScanResult({required this.ok, required this.gpsMatch, this.distanceM});

  factory ScanResult.fromJson(Map<String, dynamic> j) => ScanResult(
        ok: j['ok'] == true,
        gpsMatch: j['gpsMatch'] == true,
        distanceM: (j['distanceM'] as num?)?.toDouble(),
      );
}

class ConfirmResult {
  final String side;
  final bool allConditionsMet;
  final String? escrowStatus;
  final bool escrowReleased;

  ConfirmResult({
    required this.side,
    required this.allConditionsMet,
    this.escrowStatus,
    this.escrowReleased = false,
  });

  factory ConfirmResult.fromJson(Map<String, dynamic> j) => ConfirmResult(
        side: j['side']?.toString() ?? '',
        allConditionsMet: j['allConditionsMet'] == true,
        escrowStatus: j['escrowStatus']?.toString(),
        escrowReleased: j['escrowReleased'] == true,
      );
}
