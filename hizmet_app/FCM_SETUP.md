# Phase 113 — FCM Setup Guide

Push notifications use Firebase Cloud Messaging. The Flutter and NestJS code
are already wired — this doc covers the platform configuration that has to
happen at deploy time (and cannot be checked into git).

## 1. Create Firebase project

1. Go to <https://console.firebase.google.com> and create a project
   (e.g. `yapgitsin-prod`).
2. Enable Cloud Messaging under **Build → Cloud Messaging**.

## 2. Android setup

1. In Firebase console **Project settings → General**, click *Add app → Android*.
2. Use applicationId from `hizmet_app/android/app/build.gradle`
   (currently `com.example.hizmet_app` — change before publishing).
3. Download `google-services.json` and place at:
   `hizmet_app/android/app/google-services.json`
4. Add the Google services Gradle plugin (top-level `build.gradle`):
   ```
   classpath 'com.google.gms:google-services:4.4.2'
   ```
5. In `android/app/build.gradle`:
   ```
   apply plugin: 'com.google.gms.google-services'
   ```

> **Note:** the Flutter project currently has no `android/` folder — run
> `flutter create --platforms=android,ios .` from `hizmet_app/` first.

## 3. iOS setup

1. Add an iOS app in Firebase console.
2. Download `GoogleService-Info.plist` and drop into `ios/Runner/`.
3. Open Xcode → enable **Push Notifications** capability + **Background
   Modes → Remote notifications**.
4. Generate an APNs key in the Apple developer portal and upload it under
   **Cloud Messaging → Apple app configuration**.

## 4. Backend service account

1. Firebase console → **Project settings → Service accounts → Generate
   new private key**. Download the JSON file.
2. Paste the JSON (or its base64 encoding) into the backend env:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=...
   FIREBASE_PROJECT_ID=yapgitsin-prod
   ```
3. Without these env vars the backend silently disables push (logs
   `FCM disabled` on startup).

## 4b. Phase 161 — Native Scaffold Notes

Native folders (`android/`, `ios/`) were generated via `flutter create .
--platforms=android,ios --org com.yapgitsin.app`. After dropping the
Firebase config files in place, the build plugin wiring still has to be
added manually:

**Android** (`android/build.gradle`):
```
buildscript { dependencies { classpath 'com.google.gms:google-services:4.4.2' } }
```
**Android** (`android/app/build.gradle`, bottom):
```
apply plugin: 'com.google.gms.google-services'
```
**iOS**: `cd ios && pod install` after adding Firebase pods to Podfile.

`google-services.json` and `GoogleService-Info.plist` are gitignored —
each developer / CI pulls them from Firebase Console.

## 5. Verify

- Login on a real device.
- Backend logs: `FCM initialized`.
- Trigger any notification (e.g. send an offer).
- Foreground: in-app banner appears (Phase 79 path).
- Background: system tray push appears.
