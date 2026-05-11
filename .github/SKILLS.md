# GitHub Actions & Claude Skills Integration

**Purpose:** Document which Claude Code skills are integrated with or triggered by GitHub Actions workflows.

---

## 🔄 CI/CD Workflow → Skills Mapping

### ci.yml (Continuous Integration)

**Triggers:** `push` to master, `pull_request` to master

| Job | Skill Integration | Purpose |
|-----|------------------|---------|
| **backend** | `claude-api` | TypeScript compilation + build validation |
| **backend** | Phase 152 tests | Verify profileVideoUrl field + uploadProfileVideo method |
| **admin** | `superpowers:verification-before-completion` | Next.js build validation |
| **web** | `superpowers:verification-before-completion` | Next.js web build validation |
| **flutter** | `superpowers:verification-before-completion` | Flutter analyze + Phase 152 video_player check |

**Phase 152 Skills Added:**
- Backend: Grep-based field verification (no skill needed, inline bash)
- Flutter: Grep-based dependency check + widget existence test

---

### live-deploy.yml (Production Deployment)

**Triggers:** Manual `workflow_dispatch` (GitHub UI button)

**Targets:** web | admin | backend | app | all

| Target | Skill Integration | Purpose |
|--------|------------------|---------|
| **backend** | `claude-api` | Build + FTP deploy to /backend/ |
| **admin** | `superpowers:verification-before-completion` | Build + FTP deploy to /admin/ |
| **web** | `superpowers:verification-before-completion` | Build + FTP deploy to / |
| **app** | Phase 152 new | Flutter web build + FTP deploy to /app/ |

**Phase 152 Skills Added:**
- Flutter web build action (`subosito/flutter-action@v2`)
- FTP deploy to /app/ directory

---

### smoke.yml (Quick Validation)

**Triggers:** Manual `workflow_dispatch`

| Job | Skill | Purpose |
|-----|-------|---------|
| smoke-test | Health checks | Validate endpoints (curl /health, /api/status) |

---

### lighthouse.yml (Performance Audits)

**Triggers:** Manual `workflow_dispatch`

| Job | Skill | Purpose |
|-----|-------|---------|
| lighthouse | Web performance | Audit web app Lighthouse scores |

---

### seo-content-refresh.yml (Content Generation)

**Triggers:** Weekly cron (0 2 * * 0)

| Job | Skill | Purpose |
|-----|-------|---------|
| ai-seo-content | `claude-api` (via Phase 142 AI layer) | Generate SEO metadata + blog content |

---

## 📋 Phase 152 CI/CD Enhancements

### New in ci.yml
```yaml
Backend verification:
  - grep "profileVideoUrl" user.entity.ts
  - grep "uploadProfileVideo" uploads.service.ts

Flutter verification:
  - grep "video_player" pubspec.yaml
  - test -f profile_video_uploader.dart
```

### New in live-deploy.yml
```yaml
Build Flutter app:
  - flutter pub get
  - flutter build web --release

Deploy Flutter app:
  - FTP deploy ./hizmet_app/build/web/ → /app/
```

---

## 🚀 Manual Skill Triggers (Outside Workflows)

### In Claude Code (`.claude/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `superpowers:writing-plans` | "Phase 152 plan" | Implementation planning |
| `superpowers:executing-plans` | "Execute phase 152" | Step-by-step execution |
| `superpowers:brainstorming` | "Design phase feature" | Feature design before coding |
| `superpowers:subagent-driven-development` | "Dispatch agents" | Multi-agent parallel work |
| `claude-api` | "Build profile" | NestJS build validation |
| `cso` (Chief Security Officer) | "Security audit" | OWASP + vulnerability scan |

---

## 📖 Workflow Execution Flow

```
User Push (master branch)
    ↓
GitHub Actions: ci.yml
    ├─ Backend: tsc + build + Phase 152 tests
    ├─ Admin: tsc + build
    ├─ Web: build
    └─ Flutter: analyze + Phase 152 checks
    ↓
[All jobs pass?]
    ├─ YES → Ready for deployment
    └─ NO → Block PR/merge, alert user
```

```
User Clicks "Run Workflow" (live-deploy.yml)
    ↓
GitHub Actions: live-deploy.yml
    ├─ Build backend (if target=all|backend)
    ├─ Build admin (if target=all|admin)
    ├─ Build web (if target=all|web)
    ├─ Build Flutter app (if target=all|app) ← Phase 152 NEW
    ├─ FTP Deploy all built artifacts
    └─ Smoke test (health endpoint)
    ↓
Production Server Updated
```

---

## 🔐 Secrets Required

For `live-deploy.yml` FTP deployment:
```
FTP_HOST     = ftp.yapgitsin.tr
FTP_USER     = <github secrets>
FTP_PASS     = <github secrets>
FTP_DIR      = /httpdocs
```

---

## ✅ Phase 152 Checklist

- [x] Backend profileVideoUrl field test added to ci.yml
- [x] Backend uploadProfileVideo method test added to ci.yml
- [x] Flutter video_player dependency test added to ci.yml
- [x] Flutter widget existence test added to ci.yml
- [x] Flutter web build action added to live-deploy.yml
- [x] Flutter FTP deploy action added to live-deploy.yml
- [x] 'app' target option added to live-deploy.yml inputs
- [x] Documentation file: .github/SKILLS.md

---

**Updated:** 2026-05-11 15:50 GMT+3  
**Phase:** 152  
**Commit:** 0968546e

*Skills integration maintained by Müdür automation.*
