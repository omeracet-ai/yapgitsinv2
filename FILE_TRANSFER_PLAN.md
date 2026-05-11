# Tüm Dosya Transfer Planı (C:/ → D:/)
**User Action:** Tüm dosyaları manuel copy + rebuild

---

## 🔴 BACKEND (D:/backend ← C:/nestjs-backend) — TRANSFER + BUILD

### Step 1: Tüm Source Dosyalarını Transfer Et

**Source:** `C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/src`  
**Target:** `D:/backend/src`

```bash
# Tüm src klasörü sil ve C:/'dan kopyala
rmdir D:/backend/src /s /q
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/src D:/backend/src /E /I /Y
```

**Dosyalar (10 yeni/güncellenmiş):**
```
✅ src/entities/user.entity.ts                           (profileVideoUrl +1 line)
✅ src/modules/uploads/uploads.service.ts                (+uploadProfileVideo method)
✅ src/modules/uploads/uploads.controller.ts             (+POST /uploads/profile-video endpoint)
✅ src/modules/users/users.service.ts                    (updateProfile allows profileVideoUrl)
✅ src/modules/users/dto/update-user.dto.ts              (+profileVideoUrl field)

✨ NEW: src/app.controller.spec.ts
✨ NEW: src/app.controller.ts
✨ NEW: src/app.module.ts
✨ NEW: src/app.service.ts
✨ NEW: src/common/branded.types.ts
✨ NEW: src/common/contact-filter.ts
✨ NEW: src/common/geohash.util.ts
✨ NEW: src/common/guards/admin.guard.ts
✨ NEW: src/common/guards/super-admin.guard.ts
✨ NEW: src/common/guards/user-or-ip.throttler.guard.ts
```

### Step 2: Build Config & package.json Transfer

```bash
# tsconfig, package.json, package-lock.json, jest config'leri kopyala
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/tsconfig*.json D:/backend/ /Y
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/jest.config.js D:/backend/ /Y
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/package*.json D:/backend/ /Y
```

### Step 3: npm install (if needed) + Build

```bash
cd D:/backend

# Option A: Full clean install (safest)
rmdir node_modules /s /q
npm install
npm run build

# Option B: Incremental (faster, risky if deps mismatch)
npm install
npm run build
```

### Step 4: Verify

```bash
# Check profileVideoUrl field
findstr "profileVideoUrl" D:/backend/src/entities/user.entity.ts
# Expected: @Column({ type: 'varchar', nullable: true }) profileVideoUrl: string;

# Check upload endpoint
findstr "uploadProfileVideo" D:/backend/src/modules/uploads/uploads.service.ts
# Expected: async uploadProfileVideo(userId, file)

# Check build success
dir D:/backend/dist
# Expected: folders + compiled .js files (no errors during build)
```

---

## 🟡 FLUTTER (D:/app ← C:/hizmet_app) — REBUILD REQUIRED

### ⚠️ IMPORTANT
**D:/app is Flutter web BUILD OUTPUT (compiled JS), NOT source.**  
**Source'dan file copy işe YARAMAZ. Full rebuild zorunlu.**

### Step 1: Transfer Source Files (for reference/debugging)

```bash
# Source'u reference için copy et (opsiyonel)
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app/lib D:/app/lib /E /I /Y
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app/pubspec.yaml D:/app/ /Y
```

### Step 2: Full Web Build

```bash
cd C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app

# New dependencies gerekli
flutter pub get
# (downloads video_player: ^2.4.0)

# Build for web (production)
flutter build web --release
# (~3-5 dakika)

# Staging'e kopyala
rmdir D:/app /s /q
xcopy C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app/build/web D:/app /E /I /Y
```

### Step 3: Verify

```bash
# Check new widgets are in compiled JS
findstr /R "profileVideoUrl\|ProfileVideoUploader\|ProfileVideoPlayer" D:/app/main.dart.js
# Expected: Multiple matches (minified code)

# Check new package in manifest
findstr "video_player" D:/app/pubspec.yaml
# Expected: video_player: ^2.4.0

# Check build artifacts exist
dir D:/app
# Expected: main.dart.js, flutter_bootstrap.js, version.json, etc.
```

---

## ✅ ADMIN & WEB (No Action)

```bash
# D:/admin — Already in-sync, skip
# D:/web — Already in-sync, skip
```

---

## 📋 Full Transfer Sequence (Copy-Paste Steps)

### Terminal 1: Backend
```bash
REM === BACKEND TRANSFER + BUILD ===
rmdir D:/backend/src /s /q
xcopy "C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/src" "D:/backend/src" /E /I /Y

xcopy "C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/tsconfig*.json" "D:/backend/" /Y
xcopy "C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/jest.config.js" "D:/backend/" /Y
xcopy "C:/Users/Equ/Desktop/Yapgitsinv2/nestjs-backend/package*.json" "D:/backend/" /Y

cd D:/backend
rmdir node_modules /s /q
npm install
npm run build

REM Verify
findstr "profileVideoUrl" D:/backend/src/entities/user.entity.ts
findstr "uploadProfileVideo" D:/backend/src/modules/uploads/uploads.service.ts
dir D:/backend/dist | find "main" REM Should show compiled output
```

### Terminal 2: Flutter
```bash
REM === FLUTTER BUILD ===
cd C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app

flutter pub get
flutter build web --release

REM Copy to staging
rmdir D:/app /s /q
xcopy "C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app/build/web" "D:/app" /E /I /Y

REM Verify
dir D:/app
findstr /R "ProfileVideo" D:/app/main.dart.js | find /C "Profile"
```

---

## ⏱️ Time Estimate

| Step | Duration |
|------|----------|
| Backend transfer + npm install | 5-10 min |
| Backend build | 2-3 min |
| Flutter pub get | 2-3 min |
| Flutter build web --release | 3-5 min |
| **TOTAL** | **12-21 min** |

---

## 🔍 Verification Checklist

- [ ] D:/backend/src contains 232 .ts files (was 226)
- [ ] D:/backend/dist contains compiled .js output
- [ ] `findstr profileVideoUrl` in user.entity.ts returns 1 match
- [ ] D:/app/main.dart.js size > 5MB (web build)
- [ ] D:/app/version.json exists with new timestamp
- [ ] No errors during `npm run build`
- [ ] No errors during `flutter build web --release`

---

## 🚨 If Build Fails

**Backend error:**
```bash
cd D:/backend
npm run build 2>&1 | tail -50
# Check TypeScript errors, install missing deps if needed
```

**Flutter error:**
```bash
cd C:/Users/Equ/Desktop/Yapgitsinv2/hizmet_app
flutter build web --release 2>&1 | tail -50
# Check for missing dependencies, analyzer errors
```

---

## 📝 Notes

1. **Backup D:/backend and D:/app first** (optional pero recommended)
2. **Build happens in C:/, then copy to D:/** (staging)
3. **Test locally** before FTP upload
4. **Both builds must complete with 0 errors**

---

**Ready to transfer? Execute sequences above in two terminal windows in parallel.**
