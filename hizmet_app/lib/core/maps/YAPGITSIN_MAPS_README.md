# Yapgitsin Harita Sağlayıcı Anahtarlama Rehberi

> Phase 396 — Google Maps alt yapısı **kuruldu ama KAPALI**. Yapgitsin
> şu an OpenStreetMap (flutter_map) kullanmaya devam eder. Aşağıdaki
> adımları sırayla yaparak Google Maps'e geçebilirsin; geri dönmek için
> tek satırı `false`'a çevir.

## Mevcut durum

| Sağlayıcı | Status | Niye |
|---|---|---|
| **flutter_map + OSM** | ✅ AKTİF (default) | Ücretsiz, key gerekmez, çalışıyor |
| **Google Maps Flutter** | 🔒 ALT YAPI HAZIR / KAPALI | Pay-per-load, $200 / ay free credit |

## Aktive etmek için (6 adım, ~30 dakika)

### 1. Google Cloud Console — API key oluştur

1. https://console.cloud.google.com → New Project (veya mevcut)
2. APIs & Services → Enable:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - (Opsiyonel) Maps JavaScript API — web build için
3. APIs & Services → Credentials → Create credentials → API key
4. **Restrict the key** (kritik):
   - Application restrictions: Android apps + iOS apps
   - Android: package name `com.yapgitsin.hizmet_app` + SHA-1 (debug + release)
   - iOS: Bundle ID `com.yapgitsin.hizmet_app` (veya prod ID)
5. **Billing**: project'e billing account bağla (free credit için bile zorunlu)

### 2. AndroidManifest.xml — meta-data uncomment

`android/app/src/main/AndroidManifest.xml` aç. `<!-- Phase 396 ... -->`
bloğu içindeki `<meta-data>` satırını **comment dışına** çıkar ve key'i
yapıştır:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="AIza...SENİN_KEYIN"/>
```

### 3. iOS Info.plist — GMSApiKey uncomment

`ios/Runner/Info.plist` aç. `<!-- Phase 396 ... -->` bloğu içindeki
`GMSApiKey` satırlarını uncomment + key:

```xml
<key>GMSApiKey</key>
<string>AIza...SENİN_KEYIN</string>
```

### 4. iOS AppDelegate.swift — GMSServices.provideAPIKey

`ios/Runner/AppDelegate.swift` dosyasının `application(_:didFinishLaunching...)`
methoduna ekle:

```swift
import UIKit
import Flutter
import GoogleMaps  // ← yeni import

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GMSServices.provideAPIKey("AIza...SENİN_KEYIN")  // ← yeni
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### 5. Feature flag → açık

`lib/core/maps/map_provider_flag.dart`:

```dart
class MapProviderFlag {
  static const bool useGoogleMaps = true;  // ← false'tan true'ya
}
```

### 6. Pub get + rebuild

```bash
cd hizmet_app
flutter pub get
flutter clean
flutter run
```

## Sağlayıcıyı kullanan yerler

Aşağıdaki dosyalar `MapProviderFlag.useGoogleMaps` kontrolü ile dallanır:

- `lib/features/map/presentation/screens/map_screen.dart` (Harita sekmesi)
- `lib/features/map/presentation/widgets/workers_nearby_sheet.dart` (Hızlı Hizmet Verenler sheet)
- `lib/core/widgets/location_picker.dart` (Konum picker)

**NOT (Phase 396 anında):** Bu dosyalardaki dallanma kodu henüz EKLENMEDİ. Şu an
hepsi `flutter_map` kullanıyor. Anahtarlamayı yapıncaya kadar `useGoogleMaps`
flag'i etkisiz. Aktive ederken yukarıdaki 3 dosyada da `if (MapProviderFlag
.useGoogleMaps) { GoogleMap(...) } else { FlutterMap(...) }` patern'i
uygulanmalı. (Bu adım Phase 397 olarak ayrı dispatch edilebilir.)

## Stil

`lib/core/maps/google_maps_style.dart` içinde **2 renk sade** stil:
- `YapgitsinMapStyle.dark` — koyu tema (#0C1117 zemin, #161B22 yol/water)
- `YapgitsinMapStyle.light` — açık tema (#F8F9FA zemin, #FFFFFF yol)

Theme-aware seçim için:
```dart
final isDark = Theme.of(context).brightness == Brightness.dark;
controller.setMapStyle(isDark ? YapgitsinMapStyle.dark : YapgitsinMapStyle.light);
```

## Ücretlendirme — pratik hesap

Google Maps Platform 2026 fiyatları:
- Maps SDK for Android: **$7 / 1000 yükleme**
- Maps SDK for iOS: **$7 / 1000 yükleme**
- Aylık **$200 free credit** (≈ 28.500 yükleme/ay ücretsiz)

Yapgitsin trafiği şimdilik bu limit altında. Worst-case için:
- Her kullanıcı oturumunda ortalama **2 harita yükleme** (ilan + sheet)
- 5000 aktif kullanıcı × 2 = 10K / ay → free credit içinde
- 50.000 aktif kullanıcı × 2 = 100K / ay → $700/ay aşım

Trafik büyürse Mapbox veya self-hosted OSM tile sunucusu daha ekonomik
olabilir.

## Geri dönüş

`MapProviderFlag.useGoogleMaps = false` yap. flutter_map zaten dependency'de
duruyor; hiçbir kod silinmeyecek. Tek satır toggle.
