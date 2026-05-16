/// Phase 248 — iyzico checkout buyer payload.
///
/// Backend `CheckoutFormBuyerDto` (Phase 245) accepts all fields optional,
/// and applies server-side fallback when missing. Pass `null` to omit the
/// `user` block entirely; pass a partial instance to send only what you have.
class BuyerInfo {
  final String? id;
  final String? name;
  final String? surname;
  final String? email;

  const BuyerInfo({this.id, this.name, this.surname, this.email});

  /// Build from the `AuthAuthenticated.user` map shape used by
  /// `authStateProvider` (`uid|id`, `displayName|fullName`, `email`).
  /// Splits `displayName` into name/surname on first whitespace.
  factory BuyerInfo.fromAuthUser(Map<String, dynamic> user) {
    final raw = (user['displayName'] ?? user['fullName'] ?? '') as String;
    final trimmed = raw.trim();
    String? name;
    String? surname;
    if (trimmed.isNotEmpty) {
      final idx = trimmed.indexOf(RegExp(r'\s+'));
      if (idx < 0) {
        name = trimmed;
      } else {
        name = trimmed.substring(0, idx);
        surname = trimmed.substring(idx).trim();
        if (surname.isEmpty) surname = null;
      }
    }
    return BuyerInfo(
      id: (user['uid'] ?? user['id']) as String?,
      name: name,
      surname: surname,
      email: user['email'] as String?,
    );
  }

  /// Serialize for `POST /payments/create-session` `user` field.
  /// Omits null fields so backend fallback kicks in per-field.
  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (id != null) m['id'] = id;
    if (name != null) m['name'] = name;
    if (surname != null) m['surname'] = surname;
    if (email != null) m['email'] = email;
    return m;
  }

  bool get isEmpty =>
      id == null && name == null && surname == null && email == null;
}
