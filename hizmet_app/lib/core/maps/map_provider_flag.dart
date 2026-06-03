/// Phase 396 — Harita sağlayıcı feature flag (KAPALI).
///
/// Yapgitsin varsayılan: flutter_map + OpenStreetMap (ücretsiz, mevcut).
/// Google Maps'e geçmek için:
///   1) Google Cloud Console → Maps SDK for Android + iOS API key
///   2) android/app/src/main/AndroidManifest.xml — meta-data uncomment + key
///   3) ios/Runner/Info.plist — GMSApiKey uncomment + key
///   4) ios/Runner/AppDelegate.swift — GMSServices.provideAPIKey
///   5) Aşağıdaki `useGoogleMaps` → true
///   6) `flutter pub get` + rebuild
///
/// Geri OSM'e dönmek için: tek satır → false.
class MapProviderFlag {
  /// `true` → Google Maps; `false` → OpenStreetMap (default).
  /// **Production'a açmadan önce billing + key kontrol et.**
  static const bool useGoogleMaps = false;
}
