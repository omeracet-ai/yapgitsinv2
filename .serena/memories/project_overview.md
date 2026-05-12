# Yapgitsinv2 Project Overview

## Project Purpose
Yapgitsinv2 is a full-stack Turkish marketplace platform for services (Hizmet), similar to TaskRabbit/Airtasker. 
- Workers (Ustalar) offer services in categories (Temizlik, Elektrikçi, etc.)
- Customers request jobs with offers from workers
- System includes payments, chat, ratings, bookings, portfolio management, and AI features

## Tech Stack
- **Backend:** NestJS 11, TypeORM 0.3, Node.js
- **Database:** SQLite (dev), MySQL/PostgreSQL (prod)
- **Frontend:** Next.js (admin-panel), Flutter (hizmet_app), React web
- **APIs:** REST with Swagger/OpenAPI, WebSocket chat, Firebase integration
- **AI:** Anthropic SDK for fraud detection, content generation
- **Payment:** Iyzipay (Turkish payment provider)

## Code Structure
```
D:\Yapgitsinv2/
├── nestjs-backend/           ← NestJS backend
│   ├── src/
│   │   ├── modules/          ← Feature modules (users, reviews, jobs, etc.)
│   │   ├── common/           ← Utilities (rating.util.ts, etc.)
│   │   ├── migrations/       ← TypeORM migrations
│   │   ├── app.module.ts     ← Root module
│   │   └── main.ts
│   ├── package.json
│   └── ...
├── admin-panel/              ← Next.js admin dashboard
├── web/                       ← Next.js web frontend
├── hizmet_app/               ← Flutter mobile app
└── .claude/                  ← Claude Code configuration
```

## Key Development Commands
- `npm run start:dev` – Start backend in watch mode
- `npm run build` – Build backend
- `npm run lint` – Lint + fix
- `npm run format` – Format with Prettier
- `npm run test` – Run Jest tests
- `npm run migration:run` – Run pending migrations
- `npm run migration:generate` – Auto-generate migration from entities
