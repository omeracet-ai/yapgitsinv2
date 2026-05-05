# Claude Code Agent Teams — Türkçe Rehber

> Kaynak: https://docs.anthropic.com/en/docs/claude-code/agent-teams  
> Son güncelleme: Mayıs 2026

---

## Nedir?

Agent teams, birden fazla Claude Code oturumunu koordineli biçimde çalıştırmanı sağlar. Bir oturum **takım lideri** olarak görev yapar; görevleri dağıtır, ekibi koordine eder ve sonuçları birleştirir. Diğer üyeler (**teammate**) her biri kendi context window'unda bağımsız çalışır ve birbirleriyle doğrudan mesajlaşabilir.

> **Uyarı:** Agent teams deneysel bir özelliktir, varsayılan olarak kapalıdır. Aşağıdaki şekilde etkinleştirmek gerekir.

---

## Etkinleştirme

`settings.json` dosyasına şunu ekle:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Minimum gereksinim: **Claude Code v2.1.32+** (`claude --version` ile kontrol et)

---

## Ne Zaman Kullanılır?

### Güçlü kullanım alanları
| Senaryo | Neden iyi çalışır |
|---------|-------------------|
| Araştırma & inceleme | Birden fazla üye aynı anda farklı açılardan inceler |
| Yeni modül/özellik geliştirme | Her üye ayrı bir parçaya sahip olur, çakışma olmaz |
| Hata ayıklama (rakip hipotezler) | Üyeler paralelde farklı teorileri test eder |
| Katmanlar arası değişiklikler | Frontend, backend, test — her biri farklı üyede |

### Kullanmaman gereken durumlar
- Sıralı (sequential) görevler
- Aynı dosyayı düzenleyen işler
- Birbiriyle çok bağımlı görevler
- Rutin/basit tek oturumluk işler → **tek oturum veya subagent yeterli**

---

## Subagent ile Karşılaştırma

| Özellik | Subagent | Agent Team |
|---------|----------|------------|
| **Context** | Kendi penceresi; sonuç ana ajana döner | Kendi penceresi; tamamen bağımsız |
| **İletişim** | Sadece ana ajana rapor verir | Üyeler birbirine doğrudan mesaj atar |
| **Koordinasyon** | Ana ajan tüm işi yönetir | Paylaşılan görev listesi, öz-koordinasyon |
| **En iyi kullanım** | Sadece sonucun önemli olduğu odaklanmış görevler | Tartışma ve iş birliği gerektiren karmaşık işler |
| **Token maliyeti** | Düşük | Yüksek (her üye ayrı Claude örneği) |

**Kural:** Üyelerin birbirleriyle konuşması gerekiyorsa → agent team. Sadece sonuç lazımsa → subagent.

---

## İlk Takımı Başlatma

Lide doğal dil ile söyle:

```
CLI aracı tasarlıyorum — TODO yorumlarını codebase'de takip ediyor.
Bunu farklı açılardan inceleyen bir agent team kur:
- Bir üye UX'e baksın
- Bir üye teknik mimariye baksın
- Bir üye şeytan avukatı rolü oynasın
```

Claude otomatik olarak takımı kurar, üyeleri başlatır, paylaşılan görev listesi oluşturur ve bitince temizler.

---

## Takımı Kontrol Etme

### Görüntüleme Modları

| Mod | Nasıl çalışır | Gereksinim |
|-----|---------------|------------|
| **in-process** (varsayılan) | Tüm üyeler ana terminalinde. `Shift+Down` ile aralarında geçiş | Herhangi bir terminal |
| **split panes** | Her üye kendi panelinde. Hepsinin çıktısı aynı anda görünür | tmux veya iTerm2 |

`~/.claude/settings.json` ile ayar:

```json
{
  "teammateMode": "in-process"
}
```

Tek oturum için bayrak:

```bash
claude --teammate-mode in-process
```

**tmux kurulumu:** Sistem paket yöneticisiyle kur.  
**iTerm2:** `it2` CLI kur + iTerm2 → Settings → General → Magic → Python API'yi etkinleştir.

> Not: tmux bazı işletim sistemlerinde sorun çıkarabilir; macOS'ta en iyi çalışır.

### Üye Sayısı ve Model Belirleme

```
4 üyeli bir takım kur, bu modülleri paralelde refactor etsinler.
Her üye için Sonnet kullan.
```

### Plan Onayı Zorunluluğu

Riskli görevler için üyelerin önce plan yapmasını, sonra uygulamasını zorunlu kılabilirsin:

```
Auth modülünü refactor edecek bir mimar üye başlat.
Herhangi bir değişiklik yapmadan önce plan onayı gereksin.
```

- Üye plan hazırlar → lide onay isteği gönderir
- Lider reddederse üye plan modunda kalır, revize eder, yeniden sunar
- Onaylanınca uygulama başlar

Liderin kararlarını yönlendirmek için şöyle yaz: *"Sadece test coverage içeren planları onayla"* veya *"Veritabanı şemasını değiştiren planları reddet"*

### Üyelerle Doğrudan Konuşma

- **In-process:** `Shift+Down` ile üyeye geç, mesajını yaz. `Enter` → oturuma gir, `Escape` → mevcut adımı iptal et, `Ctrl+T` → görev listesini göster/gizle
- **Split-pane:** Üyenin paneliine tıkla, doğrudan yaz

### Görev Atama ve Sahiplenme

Paylaşılan görev listesindeki görevlerin üç durumu vardır: `pending`, `in_progress`, `completed`. Bağımlılıkları olan görevler, bağımlı oldukları görev tamamlanmadan başlayamaz.

- **Lider atar:** hangi görev hangi üyeye gidin söyle
- **Öz-sahiplenme:** üye kendi görevini bitirince sonraki müsait görevi kendisi alır

### Üyeleri Kapatma

```
Araştırmacı üyeyi kapat
```

Lider kapatma isteği gönderir. Üye onaylayabilir veya gerekçesiyle reddedebilir.

### Takımı Temizleme

```
Takımı temizle
```

> **Önemli:** Temizlemeyi sadece lider yapmalı. Üyeler temizleme yapmamalı — kaynaklar tutarsız kalabilir.

---

## Hooks ile Kalite Kapıları

[hooks](/en/hooks) kullanarak üyeler iş bitirdiğinde veya görev oluşturulup tamamlandığında kural zorunlulukları ekleyebilirsin:

| Hook | Ne zaman tetiklenir | Kod 2 ile çıkılırsa |
|------|---------------------|---------------------|
| `TeammateIdle` | Üye boşa geçmek üzereyken | Geri bildirim gönderilir, üye çalışmaya devam eder |
| `TaskCreated` | Görev oluşturulurken | Oluşturma engellenir, geri bildirim verilir |
| `TaskCompleted` | Görev tamamlandı olarak işaretlenirken | Tamamlama engellenir, geri bildirim verilir |

---

## Mimari

| Bileşen | Rol |
|---------|-----|
| **Team lead** | Takımı kuran, üyeleri başlatan, koordinasyonu yöneten ana oturum |
| **Teammates** | Her biri kendi bağımsız context'inde görev yapan Claude örnekleri |
| **Task list** | Üyelerin görev aldığı ve tamamladığı paylaşılan liste |
| **Mailbox** | Ajanlar arası mesajlaşma sistemi |

Depolama yerleri:
- **Takım config:** `~/.claude/teams/{team-name}/config.json`
- **Görev listesi:** `~/.claude/tasks/{team-name}/`

> **Uyarı:** Config dosyasını elle düzenleme — her durum güncellemesinde üzerine yazılır.

### Subagent Tanımlarını Teammate Olarak Kullanma

Daha önce tanımladığın bir subagent tipini teammate olarak çağırabilirsin:

```
security-reviewer agent tipini kullanarak bir teammate başlat, auth modülünü denetlesin.
```

- Teammate, o tanımın `tools` listesine ve `model` ayarına uyar
- Tanımın body'si sistem prompt'una eklenir (yerine geçmez)
- `SendMessage` ve görev yönetim araçları her zaman kullanılabilir
- `skills` ve `mcpServers` frontmatter alanları teammate modunda **uygulanmaz**

### İzinler

Üyeler, liderin izin ayarlarıyla başlar. Lider `--dangerously-skip-permissions` ile çalışıyorsa tüm üyeler de öyle çalışır. Başlatma sonrası bireysel modlar değiştirilebilir, başlatma anında per-teammate mod belirlenemez.

### Context ve İletişim

- Her üye kendi context window'una sahiptir
- Üye başlatılınca şunları yükler: CLAUDE.md, MCP sunucuları, skill'ler + liderin spawn prompt'u
- Liderin konuşma geçmişi **aktarılmaz**

İletişim mekanizmaları:
- **Otomatik mesaj iletimi:** Mesajlar otomatik ulaşır, lider polling yapmaz
- **Boşta bildirim:** Üye işini bitirince lide bildirim gönderir
- **Paylaşılan görev listesi:** Tüm ajanlar görev durumunu görebilir
- **Üye mesajlaşması:** İsimle belirli bir üyeye mesaj. Herkese ulaşmak için her birine ayrı mesaj gönder

### Token Maliyeti

Her üyenin kendi context window'u vardır, token maliyeti üye sayısıyla doğrusal artar. Araştırma, inceleme ve yeni özellik geliştirmede ek maliyet genellikle karşılığını verir; rutin görevler için tek oturum daha verimlidir.

---

## Kullanım Örnekleri

### Paralel Kod İncelemesi

```
PR #142'yi incele. 3 inceleyici başlat:
- Biri güvenlik açıklarına odaklanıyor
- Biri performans etkisine bakıyor
- Biri test coverage'ı doğruluyor
Her biri bulgularını raporlasın.
```

### Rakip Hipotezlerle Hata Araştırması

```
Kullanıcılar uygulamanın ilk mesajdan sonra çıktığını bildiriyor, bağlı kalması lazım.
5 agent teammate başlat, farklı hipotezleri araştırsınlar.
Birbirlerinin teorilerini çürütmeye çalışsınlar — bilimsel tartışma gibi.
Ortaya çıkan uzlaşıyı findings.md dosyasına yaz.
```

> Bu yaklaşım neden işe yarar: Tek ajan genellikle ilk makul açıklamayı bulup durur. Bağımsız araştırmacıların birbirini aktif olarak çürütmesi, gerçek kök nedeni hayatta kalan teoriye taşır.

---

## En İyi Uygulamalar

### 1. Üyelere Yeterli Context Ver

```
Spawn komutu ile şu prompt'u ver: "src/auth/ adresindeki kimlik doğrulama modülünü
güvenlik açıkları için incele. Token yönetimi, oturum yönetimi ve girdi doğrulamaya
odaklan. Uygulama httpOnly cookie'lerde JWT token kullanıyor.
Sorunları önem derecesiyle raporla."
```

### 2. Uygun Takım Boyutu Seç

- Çoğu iş akışı için **3-5 üye** başlangıç noktası
- **Üye başına 5-6 görev** optimum verimlilik
- Token maliyeti doğrusal artar; sadece gerçekten paralel faydası olan işlerde büyüt
- 5 dağınık üye çoğu zaman 3 odaklı üyeyi geçemez

### 3. Görev Boyutunu Doğru Ayarla

| Görev boyutu | Sonuç |
|---|---|
| Çok küçük | Koordinasyon maliyeti faydayı aşar |
| Çok büyük | Uzun çalışma, boşa giden çaba riski |
| Doğru | Net çıktısı olan bağımsız birimler (bir fonksiyon, test dosyası, inceleme) |

### 4. Liderin Beklemesini Söyle

Lider bazen beklemek yerine kendisi göreve başlarsa:

```
Devam etmeden önce üyelerinin görevleri tamamlamasını bekle
```

### 5. Dosya Çakışmalarından Kaçın

İki üye aynı dosyayı düzenlerse üzerine yazma olur. Her üyeye farklı dosya seti ver.

### 6. İzle ve Yönlendir

Üyelerin ilerlemesini kontrol et, işe yaramayan yaklaşımları yönlendir ve bulgular geldikçe sentezle. Takımı çok uzun süre gözetimsiz bırakma.

---

## Sorun Giderme

### Üyeler Görünmüyor

- In-process modda `Shift+Down` ile döngüyü dene
- Görevin takım kurmayı gerektirecek kadar karmaşık olup olmadığını kontrol et
- Split panes istendiyse: `which tmux` ile kurulu olup olmadığını doğrula
- iTerm2 için `it2` CLI kurulu ve Python API etkin olmalı

### Çok Fazla İzin Sorgusu

Üyelerin izin istekleri lide iletilir; bu sürtünme yaratır. Üyeleri başlatmadan önce yaygın işlemleri [izin ayarlarında](https://docs.anthropic.com/en/docs/claude-code/settings) önceden onayla.

### Üyeler Hatada Takılıyor

- In-process'te `Shift+Down`, split modda pane'e tıkla, çıktıyı kontrol et
- Doğrudan ek talimat ver veya yeni bir teammate başlatarak devam et

### Lider İş Bitmeden Kapanıyor

Lidere devam etmesini söyle. Görev devretmek yerine iş yapmaya başlarsa: *"Devam etmeden önce üyelerinin bitmesini bekle"* de.

### Artık Tmux Oturumları

```bash
tmux ls
tmux kill-session -t <oturum-adı>
```

---

## Bilinen Kısıtlamalar

| Kısıtlama | Detay |
|-----------|-------|
| Session resumption yok | `/resume` ve `/rewind` in-process teammates'i geri getirmez |
| Görev durumu gecikmesi | Üyeler bazen görevi tamamlandı olarak işaretlemeyebilir |
| Yavaş kapatma | Üye mevcut isteği/araç çağrısını bitirinceye kadar kapanmaz |
| Oturum başına bir takım | Lider aynı anda yalnızca bir takım yönetebilir |
| İç içe takım yok | Üyeler kendi takımlarını/üyelerini başlatamaz |
| Lider sabittir | Takımı oluşturan oturum ömür boyu liderdir, devir yok |
| İzinler başlatma anında belirlenir | Per-teammate mod sadece başlatma sonrası değiştirilebilir |
| Split panes terminali | VS Code, Windows Terminal, Ghostty'de desteklenmez |

> **İpucu:** CLAUDE.md dosyaları üyeler tarafından da okunur. Proje geneli yönlendirmeler için kullan.

---

## İlgili Kaynaklar

- [Subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) — ajanlar arası koordinasyon gerekmiyorsa daha hafif seçenek
- [Git Worktrees](https://docs.anthropic.com/en/docs/claude-code/worktrees) — otomatik koordinasyon olmadan paralel oturumlar
- [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — kalite kapıları ve otomatik kontroller
- [Settings](https://docs.anthropic.com/en/docs/claude-code/settings) — `teammateMode`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` vb.
