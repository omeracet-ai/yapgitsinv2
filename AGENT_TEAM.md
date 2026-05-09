# Yapgitsin Agent Team

Yapgitsinv2 projesi için 4 specialized agent (paralel-bağlı, kalıcı). Tanımlar `.claude/agents/` altında — proje ile birlikte versiyonlanır, her makinede aynı.

## Agent Tablosu

| Agent | Konu | Dosya |
|-------|------|-------|
| 🧙 db | Database & Data Flow Engineer | `.claude/agents/db.md` |
| 🧙 security | Cyber Security & Background Protection | `.claude/agents/security.md` |
| 🧙 fullstack | Senior Fullstack Software Engineer | `.claude/agents/fullstack.md` |
| 🧙 ops | Local Infrastructure & Troubleshooting | `.claude/agents/ops.md` |

## Ne Zaman Hangisi

| Durum | Agent |
|-------|-------|
| "Yeni entity ekle, migration üret, query yavaş, index öner" | **db** |
| "JWT denetle, OWASP audit, rate limit yetersiz, secret sızıntısı" | **security** |
| "Yeni feature, ekran, endpoint, bileşen, test yaz" | **fullstack** |
| "Docker patladı, port çakışması, sunucu yavaş, log incele" | **ops** |

## Dispatch Örneği

```
Tek agent:
"@db hizmet_db.sqlite şemasını PostgreSQL'e taşıma planı çıkar."

"@security nestjs-backend JWT akışını ve rate limit ayarını denetle."

"@fullstack /jobs/:id/questions endpoint'i için Flutter ekranını yaz."

"@ops port 3001 zombie process sorunu — root cause ve kalıcı çözüm öner."
```

## Paralel Kombinasyon Örnekleri

- **Yeni özellik (uçtan uca):** `fullstack` (UI + API) → `db` (şema + index) → `security` (auth + input validation) → `ops` (deploy + monitor)
- **Performans regresyonu:** `ops` (metrics) + `db` (slow query) paralel; sonuçları `fullstack` birleştirir
- **Production incident:** `ops` (logs) + `security` (saldırı mı?) paralel; kritik bulgu `fullstack`'e geçer
- **Audit haftası:** 4 agent paralel — her biri kendi alanında rapor; ana asistan konsolide eder

## Token Disiplini

Her agent dispatch'inde zorunlu kural:
- Read offset+limit, full file YOK
- Grep head_limit:15
- Bash | tail
- git diff --stat
- Verbose yok, re-read yok
- Çıktı maksimum 130 kelime (özetler için)
