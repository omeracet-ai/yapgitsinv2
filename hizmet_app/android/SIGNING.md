# Android Release Signing

## One-time setup (per dev machine)
1. `cd hizmet_app\android`
2. `.\generate-keystore.ps1` (creates `app\upload-keystore.jks`)
3. `Copy-Item key.properties.example key.properties` and fill passwords
4. Backup `app\upload-keystore.jks` + `key.properties` securely. Lost = no more Play updates.

## Build
- `flutter build appbundle --release` (signs with upload keystore if `key.properties` exists, else debug fallback)
- Output: `build\app\outputs\bundle\release\app-release.aab`

## Gitignored
`key.properties`, `*.jks`, `*.keystore`, `upload-keystore.*` — see root `.gitignore`.

## Gradle
`android/app/build.gradle.kts` loads `key.properties` from `rootProject` (= `android/`).
`storeFile` is resolved relative to the `:app` module, so the keystore lives at `android/app/upload-keystore.jks`.
