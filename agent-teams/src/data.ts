export const subAgentMesajlariDetay: Record<string, string[]> = {
  'Frontend Team': [
    '🎨 UI bileşenleri yeniden render ediliyor...',
    '⚛️ React state güncellemesi: 14 bileşen',
    '🧪 Jest testleri koşuluyor: 38/42 ✅',
    '📱 Responsive breakpoint kontrol ediliyor',
    '🔧 CSS Modules yeniden derleniyor...',
    '✅ npm run build: başarılı (42 test geçti)',
  ],
  'Backend Team': [
    '🗄️ MySQL bağlantısı test ediliyor: OK',
    '🔌 REST API /jobs endpoint yanıt: 47ms',
    '🔐 JWT token doğrulaması çalışıyor',
    '📦 npm audit: 0 kritik açık bulundu',
    '🚀 NestJS build: dist/ klasörü güncellendi',
    '✅ Tüm endpoint testleri geçti: 18/18',
  ],
  'AI Team': [
    '🤖 Model eğitimi: epoch 24/50',
    '📈 Accuracy: %94.7 — loss: 0.032',
    '🧮 Token kullanımı: 12.4k/128k',
    '🔬 Prompt caching hit rate: %78',
    '💾 Model checkpoint kaydedildi',
    '✅ Eval suite tamamlandı: A+ skoru',
  ],
};

export const muduriyeGorevler = [
  { task: 'Cache TTL Optimizasyonu',     result: 'Miss oranı: %23 → %4 ✅' },
  { task: 'TypeScript Strict Mode',      result: '0 type hata — derleme temiz ✅' },
  { task: 'MySQL Query Optimizer',       result: 'Sorgu süresi: 120ms → 34ms ✅' },
  { task: 'API Rate Limit Konfigürasyon',result: 'DDoS koruma aktif — 60 req/dk ✅' },
  { task: 'Redis Cluster Entegrasyonu',  result: 'Yük dağılımı optimize — +%18 hız ✅' },
];

export const muduriyeFazlari = [
  { id: 'gorev',     icon: '📋', label: 'GÖREV AL',          color: '#3498db' },
  { id: 'voldemort', icon: '🧙', label: 'VOLDEMORT ÖNERİSİ', color: '#00e5a0' },
  { id: 'execute',   icon: '⚙️', label: 'UYGULA',            color: '#f39c12' },
  { id: 'test',      icon: '🧪', label: 'TEST',               color: '#9b59b6' },
  { id: 'commit',    icon: '💾', label: 'COMMIT',             color: '#e67e22' },
  { id: 'push',      icon: '🚀', label: 'PUSH',               color: '#2ecc71' },
  { id: 'rapor',     icon: '📊', label: 'MÜDÜR RAPORU',      color: '#e74c3c' },
];

export const kodSatirlari = [
  'const server = express();',
  'app.use(cors());',
  'await db.query(sql);',
  'return res.json({ ok: 1 });',
  'logger.info("done");',
  'if (err) throw err;',
  'const t = jwt.sign(d);',
  'cache.set(k, v, 300);',
  'await queue.process(j);',
  'socket.emit("up", m);',
];

export interface KonsolSatiri { ts: string; level: 'info'|'warn'|'error'|'debug'; msg: string }

export const konsolMesajlari: Array<{level: KonsolSatiri['level']; msg: string}> = [
  { level: 'info',  msg: '[MÜDÜRİYE] Görev döngüsü başlatıldı — VOLDEMORT danışma modu aktif' },
  { level: 'debug', msg: '[VOLDEMORT] Görev analizi: Cache TTL optimizasyonu → öneri hazır' },
  { level: 'info',  msg: '[GÖREV AJAN] VOLDEMORT önerisi alındı: "Redis TTL 60s → 30s"' },
  { level: 'info',  msg: '[GÖREV AJAN] Öneri uygulandı — 3 dosya güncellendi' },
  { level: 'info',  msg: '[TEST] Jest suite: 47/47 geçti ✅ — deploy hazır' },
  { level: 'debug', msg: '[COMMIT] git commit -m "perf: cache TTL optimizasyonu"' },
  { level: 'info',  msg: '[PUSH] git push origin master → başarılı ✅' },
  { level: 'info',  msg: '[RAPOR AJAN] Müdür raporu derleniyor: 1 görev, başarılı' },
  { level: 'info',  msg: '[MÜDÜRİYE → MÜDÜR] Rapor iletildi: miss oranı %23 → %4 ✅' },
  { level: 'debug', msg: '[VOLDEMORT] Yeni görev önerisi: MySQL index ekle — %71 hız artışı' },
  { level: 'info',  msg: '[GÖREV AJAN] Yeni görev alındı: "MySQL Query Optimizer"' },
  { level: 'info',  msg: '[TEST] DB sorgu süresi: 120ms → 34ms ✅' },
  { level: 'debug', msg: '[COMMIT] git commit -m "perf: mysql query optimizer"' },
  { level: 'info',  msg: '[PUSH] origin/master → cfb1685c ✅' },
  { level: 'info',  msg: '[MÜDÜRİYE → MÜDÜR] Görev #2 tamamlandı: sorgu %71 hızlandı ✅' },
  { level: 'debug', msg: 'WebSocket bağlantısı kuruldu (port 3001)' },
  { level: 'info',  msg: 'MySQL havuzu aktif: 10 bağlantı / pyapgiXu_ypgtsn' },
  { level: 'info',  msg: '[CACHE] Redis bağlantısı kuruldu — localhost:6379' },
  { level: 'info',  msg: '[CACHE] Cache miss oranı düştü: %23 → %4 ✅' },
  { level: 'info',  msg: '[FRONTEND] Jest test suite çalıştırıldı: 42/42 geçti ✅' },
  { level: 'info',  msg: 'API yanıt süresi: 42ms (target: <200ms) ✅' },
  { level: 'error', msg: 'Timeout: /api/analytics — retry 1/3 başlatılıyor...' },
  { level: 'info',  msg: 'Retry başarılı — /api/analytics 187ms' },
  { level: 'info',  msg: '[AI] Model eval: accuracy=%94.7, loss=0.032' },
  { level: 'warn',  msg: 'Bellek kullanımı: %78 — GC tetikleniyor' },
  { level: 'debug', msg: 'GC tamamlandı — serbest: 2.4GB' },
  { level: 'info',  msg: '[BACKEND] 18/18 unit test geçti — deploy hazır' },
  { level: 'debug', msg: '[VOLDEMORT] Analiz tamamlandı — API rate limit ayarı önerisi gönderildi' },
];

export interface Gorev { name: string; status: 'running'|'queued'|'done'; time: string }

export const baslangicGorevleri: Gorev[] = [
  { name: 'DB Optimizasyonu', status: 'running', time: '2dk önce' },
  { name: 'API Test Suite', status: 'running', time: '5dk önce' },
  { name: 'Cache Yenileme', status: 'queued', time: 'sırada' },
  { name: 'Log Analizi', status: 'queued', time: 'sırada' },
  { name: 'Güvenlik Taraması', status: 'done', time: '12dk önce' },
  { name: 'Frontend Build', status: 'done', time: '18dk önce' },
  { name: 'Bildirim Servisi', status: 'done', time: '25dk önce' },
];

export const gorevBitirmeMesajlari = [
  { msg: '⚡ [MÜDÜR] DB Optimizasyonu tamamlanıyor... Sorgu süresi %65 düştü!', level: 'info' as const },
  { msg: '✅ [MÜDÜR] DB Optimizasyonu — TAMAMLANDI ✅', level: 'info' as const },
  { msg: '⚡ [MÜDÜR] API Test Suite çalıştırılıyor... 58/58 test...', level: 'info' as const },
  { msg: '✅ [MÜDÜR] API Test Suite — 58/58 BAŞARILI ✅', level: 'info' as const },
  { msg: '⚡ [MÜDÜR] Cache Yenileme başlatıldı... Redis flush & rebuild', level: 'info' as const },
  { msg: '✅ [MÜDÜR] Cache Yenileme — Miss oranı %2 ✅', level: 'info' as const },
  { msg: '⚡ [MÜDÜR] Log Analizi çalışıyor... 48,000 satır taranıyor...', level: 'debug' as const },
  { msg: '✅ [MÜDÜR] Log Analizi — 0 kritik hata, 2 uyarı ✅', level: 'info' as const },
  { msg: '🎉 [MÜDÜR] TÜM GÖREVLER TAMAMLANDI! Bugünlük işler bitti patron! 🏆', level: 'info' as const },
];

export const ekipler = [
  { id: 1, name: 'Frontend Ekibi', status: 'Aktif', count: 3, color: '#3498db', tasks: ['UI Optimizasyonu'] },
  { id: 2, name: 'Backend Ekibi', status: 'Meşgul', count: 4, color: '#2ecc71', tasks: ['API Refactor'] },
  { id: 3, name: 'AI/ML Takımı', status: 'Eğitimde', count: 2, color: '#9b59b6', tasks: ['Model Training'] },
  { id: 4, name: 'Müdüriye', status: 'Aktif', count: 2, color: '#f39c12', tasks: ['VOLDEMORT Danışma → Rapor'] },
];

export type CharState = 'typing' | 'walking-to-coffee' | 'drinking' | 'walking-to-window' | 'looking' | 'walking-back' | 'break' | 'walking-to-teams' | 'inspecting' | 'celebrating';

export function simdiSaat(): string {
  const d = new Date();
  return d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
