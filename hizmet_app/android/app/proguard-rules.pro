# Phase 191 — Social Sign-In (Google + Apple via Firebase)
# Keep classes used by Firebase Auth + Google Sign-In reflection so release
# builds don't strip credential / token helpers.
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.firebase.auth.** { *; }

# google_sign_in plugin uses Play Services Auth under the hood.
-keep class com.google.android.gms.auth.api.signin.** { *; }

# Firebase generally
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
