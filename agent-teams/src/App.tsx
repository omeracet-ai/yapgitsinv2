import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

/* ===== VERİ ===== */
const agentMesajlari = [
  { icon: '🔍', text: 'Veritabanı sorguları optimize ediliyor...' },
  { icon: '🛡️', text: 'Güvenlik taraması çalıştırılıyor...' },
  { icon: '📦', text: 'Yeni modül deploy ediliyor...' },
  { icon: '🧠', text: 'Yapay zeka modeli eğitiliyor...' },
  { icon: '📊', text: 'Performans metrikleri analiz ediliyor...' },
  { icon: '🔄', text: 'Cache belleği yenileniyor...' },
  { icon: '🐛', text: 'Bug fix merge ediliyor...' },
  { icon: '📡', text: 'API endpoint\'leri test ediliyor...' },
  { icon: '⚡', text: 'Sunucu yanıt süresi iyileştiriliyor...' },
  { icon: '🗄️', text: 'Yedekleme işlemi başlatıldı...' },
  { icon: '🔗', text: 'Mikroservisler senkronize ediliyor...' },
  { icon: '📝', text: 'Kullanıcı geri bildirimleri işleniyor...' },
];

const subAgentMesajlariDetay: Record<string, string[]> = {
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

const kahveMesajlari = [
  { icon: '☕', text: 'Bir kahve molası...' },
  { icon: '☕', text: 'Enerji şarj ediliyor!' },
  { icon: '🍵', text: 'Çay mı kahve mi... kahve!' },
];

const denetimMesajlari = [
  { icon: '🧐', text: 'Ekiplerin durumunu kontrol ediyorum...' },
  { icon: '👀', text: 'Frontend ekibi iyi gidiyor.' },
  { icon: '✅', text: 'Backend testleri başarılı.' },
  { icon: '🚀', text: 'Hızlanalım arkadaşlar!' }
];

const pencereMesajlari = [
  { icon: '🤔', text: 'Bugün hava çok güzel...' },
  { icon: '🏙️', text: 'Şehir manzarası ilham veriyor.' },
  { icon: '☁️', text: 'Bulutlara bakıp algoritma düşünüyorum.' }
];

const yorgunMesajlari = [
  { icon: '😫', text: 'Çok yorgunum ama limit doldu!' },
  { icon: '💤', text: 'Enerji %10, mola izni yok...' },
  { icon: '🧱', text: 'Plan limiti mola vermemi engelliyor.' }
];

const muduriyeGorevler = [
  { task: 'Cache TTL Optimizasyonu',     result: 'Miss oranı: %23 → %4 ✅' },
  { task: 'TypeScript Strict Mode',      result: '0 type hata — derleme temiz ✅' },
  { task: 'MySQL Query Optimizer',       result: 'Sorgu süresi: 120ms → 34ms ✅' },
  { task: 'API Rate Limit Konfigürasyon',result: 'DDoS koruma aktif — 60 req/dk ✅' },
  { task: 'Redis Cluster Entegrasyonu',  result: 'Yük dağılımı optimize — +%18 hız ✅' },
];

const muduriyeFazlari = [
  { id: 'gorev',     icon: '📋', label: 'GÖREV AL',          color: '#3498db' },
  { id: 'voldemort', icon: '🧙', label: 'VOLDEMORT ÖNERİSİ', color: '#00e5a0' },
  { id: 'execute',   icon: '⚙️', label: 'UYGULA',            color: '#f39c12' },
  { id: 'test',      icon: '🧪', label: 'TEST',               color: '#9b59b6' },
  { id: 'commit',    icon: '💾', label: 'COMMIT',             color: '#e67e22' },
  { id: 'push',      icon: '🚀', label: 'PUSH',               color: '#2ecc71' },
  { id: 'rapor',     icon: '📊', label: 'MÜDÜR RAPORU',      color: '#e74c3c' },
];

const kodSatirlari = [
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

interface KonsolSatiri { ts: string; level: 'info'|'warn'|'error'|'debug'; msg: string }

const konsolMesajlari: Array<{level: KonsolSatiri['level']; msg: string}> = [
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

interface Gorev { name: string; status: 'running'|'queued'|'done'; time: string }

const baslangicGorevleri: Gorev[] = [
  { name: 'DB Optimizasyonu', status: 'running', time: '2dk önce' },
  { name: 'API Test Suite', status: 'running', time: '5dk önce' },
  { name: 'Cache Yenileme', status: 'queued', time: 'sırada' },
  { name: 'Log Analizi', status: 'queued', time: 'sırada' },
  { name: 'Güvenlik Taraması', status: 'done', time: '12dk önce' },
  { name: 'Frontend Build', status: 'done', time: '18dk önce' },
  { name: 'Bildirim Servisi', status: 'done', time: '25dk önce' },
];

type CharState = 'typing' | 'walking-to-coffee' | 'drinking' | 'walking-to-window' | 'looking' | 'walking-back' | 'break' | 'walking-to-teams' | 'inspecting';

function simdiSaat(): string {
  const d = new Date();
  return d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

/* ===== EKİP AGENT BİLEŞENİ ===== */
function EkipAgent({ name, color, delay, isWorkHours }: { name: string, color: string, delay: number, isWorkHours: boolean }) {
  const [isTyping, setIsTyping] = useState(true);
  const [mesaj, setMesaj] = useState(subAgentMesajlariDetay[name]?.[0] ?? 'Hazır...');
  const [popupVisible, setPopupVisible] = useState(false);
  const detaylar = subAgentMesajlariDetay[name] ?? ['Çalışıyor...'];

  useEffect(() => {
    const iv = setInterval(() => {
      if (isWorkHours) {
        setIsTyping(Math.random() > 0.2);
        if (Math.random() > 0.6) {
          setMesaj(detaylar[Math.floor(Math.random() * detaylar.length)]);
          setPopupVisible(true);
          setTimeout(() => setPopupVisible(false), 3500);
        }
      } else {
        setIsTyping(false);
        setMesaj('Mesai bitti, mola! ☕');
        setPopupVisible(true);
      }
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, [isWorkHours, detaylar]);

  return (
    <div className="sub-agent-container" style={{ animationDelay: `${delay}s` }}>
      <div className={`sub-popup ${popupVisible ? 'visible' : ''}`}>{mesaj}</div>
      <div className="sub-agent-desk">
        <div className="sub-agent-monitor">
          <div className="sub-monitor-glow" style={{ backgroundColor: color }}></div>
        </div>
      </div>
      <div className={`sub-character ${isTyping ? 'typing' : ''} ${!isWorkHours ? 'resting' : ''}`}>
        <div className="sub-char-head">
          <div className="sub-char-hair"></div>
        </div>
        <div className="sub-char-body" style={{ background: `linear-gradient(180deg, ${color}, #1d4ed8)` }}>
          <div className="sub-char-arm left"></div>
          <div className="sub-char-arm right"></div>
        </div>
      </div>
      <div className="sub-agent-label">{name}</div>
    </div>
  );
}

/* ===== GELİŞTİRİCİ AGENT BİLEŞENİ (VOLDEMORT) ===== */
function DeveloperAgent({ isWorkHours }: { isWorkHours: boolean }) {
  const [isTyping, setIsTyping] = useState(true);
  const [popupVisible, setPopupVisible] = useState(false);
  const devMesajlari = [
    '🧙 MÜDÜRİYE\'ye öneri: Cache TTL\'yi 30s yap',
    '🔧 Görev Ajanı\'na: TypeScript strict optimize et',
    '📊 Analiz tamamlandı — Rapor Ajanı\'na iletiyorum',
    '✅ Müdür, build başarılı: v2.14.8',
    '🧙 Öneri: MySQL index ekle — sorgu %71 hızlanır',
    '🔗 API test tamamlandı — Müdüriye\'ye rapor gönderildi',
    '🧙 Redis cluster önerisi: 3 node → miss %4\'e düştü',
  ];
  const [mesaj, setMesaj] = useState(devMesajlari[0]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (isWorkHours) {
        setIsTyping(Math.random() > 0.1);
        if (Math.random() > 0.6) {
          setMesaj(devMesajlari[Math.floor(Math.random() * devMesajlari.length)]);
          setPopupVisible(true);
          setTimeout(() => setPopupVisible(false), 3000);
        }
      }
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, [isWorkHours]);

  return (
    <div className="dev-agent-container">
      <div className={`sub-popup dev-popup ${popupVisible ? 'visible' : ''}`}>{mesaj}</div>
      <div className="sub-agent-desk dev-desk">
        <div className="sub-agent-monitor">
          <div className="sub-monitor-glow" style={{ backgroundColor: '#00e5a0' }}></div>
        </div>
      </div>
      <div className={`sub-character dev-char ${isTyping ? 'typing' : ''}`}>
        <div className="sub-char-head dev-head">
          <div className="sub-char-hair dev-hair"></div>
        </div>
        <div className="sub-char-body dev-body" style={{ background: '#00e5a0' }}>
          <div className="sub-char-arm left"></div>
          <div className="sub-char-arm right"></div>
        </div>
      </div>
      <div className="sub-agent-label dev-label">VOLDEMORT</div>
    </div>
  );
}

/* ===== MÜDÜRİYE DEPARTMANI — VOLDEMORT DANIŞMA + RAPOR DÖNGÜSÜ ===== */
function MuduriyeManager() {
  const [fazIndex, setFazIndex] = useState(0);
  const [gorevIndex, setGorevIndex] = useState(0);
  const [popupVisible, setPopupVisible] = useState(true);

  const faz = muduriyeFazlari[fazIndex];
  const gorev = muduriyeGorevler[gorevIndex];

  const fazMesajlari: Record<string, string> = {
    gorev:     `📋 Yeni görev alındı: "${gorev.task}"`,
    voldemort: `🧙 VOLDEMORT önerisi: "${gorev.task}" için en iyi yaklaşım hazır`,
    execute:   `⚙️ Öneri uygulanıyor — ${gorev.task}...`,
    test:      `🧪 Test suite çalıştırılıyor — sonuç bekleniyor...`,
    commit:    `💾 git commit -m "feat: ${gorev.task.toLowerCase()}"`,
    push:      `🚀 git push origin master → başarılı ✅`,
    rapor:     `📊 Müdür, görev tamamlandı: ${gorev.result}`,
  };

  useEffect(() => {
    const fazSureleri = [2500, 4000, 3500, 3000, 2000, 2000, 4500];
    const sure = fazSureleri[fazIndex];
    const t = setTimeout(() => {
      setPopupVisible(false);
      setTimeout(() => {
        const nextFaz = (fazIndex + 1) % muduriyeFazlari.length;
        if (nextFaz === 0) setGorevIndex(g => (g + 1) % muduriyeGorevler.length);
        setFazIndex(nextFaz);
        setPopupVisible(true);
      }, 400);
    }, sure);
    return () => clearTimeout(t);
  }, [fazIndex]);

  return (
    <div className="muduriye-active">
      <div className="muduriye-faz-bar">
        {muduriyeFazlari.map((f, i) => (
          <div
            key={f.id}
            className={`muduriye-faz-item ${i === fazIndex ? 'active' : ''} ${i < fazIndex ? 'done' : ''}`}
            style={{ '--faz-color': f.color } as React.CSSProperties}
            title={f.label}
          >
            <span>{f.icon}</span>
          </div>
        ))}
      </div>

      <div className={`muduriye-faz-msg ${popupVisible ? 'visible' : ''}`} style={{ borderColor: faz.color }}>
        <span className="muduriye-faz-label" style={{ color: faz.color }}>{faz.label}</span>
        <span className="muduriye-faz-text">{fazMesajlari[faz.id]}</span>
      </div>

      <div className="muduriye-agents-row">
        <div className="muduriye-agent-slot">
          <div className="sub-agent-desk muduriye-agent-desk">
            <div className="sub-agent-monitor">
              <div className="sub-monitor-glow" style={{ backgroundColor: faz.color }}></div>
            </div>
          </div>
          <div className="sub-character typing">
            <div className="sub-char-head"><div className="sub-char-hair"></div></div>
            <div className="sub-char-body" style={{ background: `linear-gradient(180deg, ${faz.color}, #1d4ed8)` }}>
              <div className="sub-char-arm left"></div>
              <div className="sub-char-arm right"></div>
            </div>
          </div>
          <div className="sub-agent-label">Görev Ajanı</div>
        </div>

        <div className="muduriye-agent-slot">
          <div className="sub-agent-desk muduriye-agent-desk">
            <div className="sub-agent-monitor">
              <div className="sub-monitor-glow" style={{ backgroundColor: fazIndex === 6 ? '#e74c3c' : '#555' }}></div>
            </div>
          </div>
          <div className={`sub-character ${fazIndex === 6 ? 'typing' : ''}`}>
            <div className="sub-char-head"><div className="sub-char-hair"></div></div>
            <div className="sub-char-body" style={{ background: 'linear-gradient(180deg, #e74c3c, #8e44ad)' }}>
              <div className="sub-char-arm left"></div>
              <div className="sub-char-arm right"></div>
            </div>
          </div>
          <div className="sub-agent-label">Rapor Ajanı</div>
        </div>
      </div>
    </div>
  );
}

const ekipler = [
  { id: 1, name: 'Frontend Ekibi', status: 'Aktif', count: 3, color: '#3498db', tasks: ['UI Optimizasyonu'] },
  { id: 2, name: 'Backend Ekibi', status: 'Meşgul', count: 4, color: '#2ecc71', tasks: ['API Refactor'] },
  { id: 3, name: 'AI/ML Takımı', status: 'Eğitimde', count: 2, color: '#9b59b6', tasks: ['Model Training'] },
  { id: 4, name: 'Müdüriye', status: 'Aktif', count: 2, color: '#f39c12', tasks: ['VOLDEMORT Danışma → Rapor'] },
];

/* ===== MONİTÖR ===== */
function MonitorEkrani() {
  const [satirlar, setSatirlar] = useState<string[]>([]);
  useEffect(() => {
    const iv = setInterval(() => {
      setSatirlar(p => {
        const y = [...p, kodSatirlari[Math.floor(Math.random()*kodSatirlari.length)]];
        return y.length > 8 ? y.slice(-8) : y;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="monitor-screen">
      {satirlar.map((s,i) => (
        <div key={i} className="code-line" style={{animationDelay:`${i*0.05}s`}}>
          <span style={{color:'#6b7280'}}>{i+1} </span>{s}
        </div>
      ))}
      <span style={{animation:'blink-eye 1s infinite'}}>▌</span>
    </div>
  );
}

/* ===== KLAVYE ===== */
function Klavye({ aktif }: { aktif: boolean }) {
  const [tuslar, setTuslar] = useState<number[]>([]);
  useEffect(() => {
    if (!aktif) { setTuslar([]); return; }
    const iv = setInterval(() => {
      const t: number[] = [];
      for (let i = 0; i < 2+Math.floor(Math.random()*3); i++) t.push(Math.floor(Math.random()*30));
      setTuslar(t);
    }, 150);
    return () => clearInterval(iv);
  }, [aktif]);
  const row = (s: number, n: number) =>
    Array.from({length:n},(_,i) => <div key={s+i} className={`key ${tuslar.includes(s+i)?'active':''}`}/>);
  return (
    <div className="keyboard">
      <div className="key-row">{row(0,10)}</div>
      <div className="key-row">{row(10,10)}</div>
      <div className="key-row">{row(20,10)}</div>
    </div>
  );
}

/* ===== PENCERE ===== */
function Pencere() {
  const y = Array.from({length:8},(_,i) => ({
    id:i, top:5+Math.random()*70, left:5+Math.random()*90,
    delay:Math.random()*3, dur:2+Math.random()*3
  }));
  return (
    <div className="window">
      {y.map(s => <div key={s.id} className="window-star" style={{top:`${s.top}%`,left:`${s.left}%`,animationDelay:`${s.delay}s`,animationDuration:`${s.dur}s`}}/>)}
      <div className="window-divider"/><div className="window-divider-h"/>
    </div>
  );
}

/* ===== ANA UYGULAMA ===== */
function App() {
  const [mesaj, setMesaj] = useState(agentMesajlari[0]);
  const [popupGorunur, setPopupGorunur] = useState(true);
  const [konsol, setKonsol] = useState<KonsolSatiri[]>([]);
  const [saat, setSaat] = useState(simdiSaat());
  const [charState, setCharState] = useState<CharState>('typing');
  const [charX, setCharX] = useState(0);
  const [charY, setCharY] = useState(0);
  const [planUsage, setPlanUsage] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [isWorkHours, setIsWorkHours] = useState(true);
  const konsolRef = useRef<HTMLDivElement>(null);

  const gorevleriCek = useCallback(() => {
    setPlanUsage(Math.min(100, (baslangicGorevleri.length / 50) * 100));
  }, []);

  useEffect(() => { gorevleriCek(); }, [gorevleriCek]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (isWorkHours) {
        if (charState === 'typing') {
          setEnergy(e => Math.max(0, e - 0.8));
          setPlanUsage(p => Math.min(100, p + 0.3));
        } else if (charState === 'drinking') {
          setEnergy(e => Math.min(100, e + 5));
        }
      }
      if (planUsage >= 100) setIsWorkHours(false);
    }, 1000);
    return () => clearInterval(iv);
  }, [charState, isWorkHours, planUsage]);

  useEffect(() => {
    const iv = setInterval(() => setSaat(simdiSaat()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const dongu = () => {
      if (!isWorkHours) {
        setCharState('break');
        setMesaj({ icon: '🎉', text: 'Mesai bitti mola!' });
        setPopupGorunur(true);
        return;
      }
      setCharState('typing');
      setCharX(0);
      setCharY(0);
      const yazmaSuresi = 8000 + Math.random() * 8000;
      timeout = setTimeout(() => {
        if (energy < 25) {
          if (planUsage > 85) {
            setMesaj(yorgunMesajlari[Math.floor(Math.random() * yorgunMesajlari.length)]);
            setPopupGorunur(true);
            setTimeout(() => { setPopupGorunur(false); dongu(); }, 4000);
            return;
          }
          setCharState('walking-to-coffee');
          setCharX(-180);
          setPopupGorunur(false);
          timeout = setTimeout(() => {
            setCharState('drinking');
            setMesaj(kahveMesajlari[Math.floor(Math.random()*kahveMesajlari.length)]);
            setPopupGorunur(true);
            timeout = setTimeout(() => {
              setPopupGorunur(false);
              setCharState('walking-back');
              setCharX(0);
              timeout = setTimeout(dongu, 1500);
            }, 5000);
          }, 1500);
          return;
        }
        const aksiyon = Math.random();
        if (aksiyon < 0.3 && planUsage < 85) {
          setCharState('walking-to-window');
          setCharX(-50);
          setPopupGorunur(false);
          timeout = setTimeout(() => {
            setCharState('looking');
            setMesaj(pencereMesajlari[Math.floor(Math.random()*pencereMesajlari.length)]);
            setPopupGorunur(true);
            timeout = setTimeout(() => {
              setPopupGorunur(false);
              setCharState('walking-back');
              setCharX(0);
              timeout = setTimeout(dongu, 1500);
            }, 4000);
          }, 1200);
        } else if (aksiyon < 0.6) {
          setCharState('walking-to-teams');
          setCharY(-150);
          setCharX(Math.random() * 200 - 100);
          setPopupGorunur(false);
          timeout = setTimeout(() => {
            setCharState('inspecting');
            setMesaj(denetimMesajlari[Math.floor(Math.random()*denetimMesajlari.length)]);
            setPopupGorunur(true);
            timeout = setTimeout(() => {
              setPopupGorunur(false);
              setCharState('walking-back');
              setCharX(0);
              setCharY(0);
              timeout = setTimeout(dongu, 1500);
            }, 5000);
          }, 2000);
        } else {
          dongu();
        }
      }, yazmaSuresi);
    };
    dongu();
    return () => clearTimeout(timeout);
  }, [isWorkHours, energy, planUsage]);

  useEffect(() => {
    if (charState !== 'typing' || !isWorkHours) return;
    const iv = setInterval(() => {
      setPopupGorunur(false);
      setTimeout(() => {
        setMesaj(agentMesajlari[Math.floor(Math.random()*agentMesajlari.length)]);
        setPopupGorunur(true);
      }, 500);
    }, 5000);
    return () => clearInterval(iv);
  }, [charState, isWorkHours]);

  const konsolEkle = useCallback(() => {
    const m = konsolMesajlari[Math.floor(Math.random()*konsolMesajlari.length)];
    setKonsol(p => {
      const y = [...p, { ts: simdiSaat(), level: m.level, msg: m.msg }];
      return y.length > 50 ? y.slice(-50) : y;
    });
  }, []);

  useEffect(() => {
    const iv = setInterval(konsolEkle, 3000+Math.random()*2000);
    return () => clearInterval(iv);
  }, [konsolEkle]);

  // Konsol otomatik scroll
  useEffect(() => {
    if (konsolRef.current) {
      konsolRef.current.scrollTop = konsolRef.current.scrollHeight;
    }
  }, [konsol]);

  const isWalking = charState.startsWith('walking');
  const isTyping = charState === 'typing';

  return (
    <div className="app-root">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>⚡ AGENT-TEAMS</h1>
          <div className="subtitle">Yapgitsin AI İş Gücü Monitörü</div>
        </div>

        <div className="usage-section energy-section">
          <div className="usage-header">
            <span>MÜDÜR ENERJİ</span>
            <span>{Math.round(energy)}%</span>
          </div>
          <div className="usage-bar-container">
            <div
              className={`usage-bar energy-bar ${energy < 25 ? 'critical' : energy < 50 ? 'warning' : ''}`}
              style={{ width: `${energy}%`, background: energy < 25 ? '#e74c3c' : '#f1c40f' }}
            ></div>
          </div>
        </div>

        <div className="usage-section">
          <div className="usage-header">
            <span>PLAN USAGE LIMIT</span>
            <span>{Math.round(planUsage)}%</span>
          </div>
          <div className="usage-bar-container">
            <div
              className={`usage-bar ${planUsage > 90 ? 'critical' : planUsage > 75 ? 'warning' : ''}`}
              style={{ width: `${planUsage}%` }}
            ></div>
          </div>
        </div>

        <div className="sidebar-stats">
          <div className="stat-row"><span className="stat-label">Durum</span><span className="stat-value active">{isWorkHours ? '● Mesai Devam' : '○ Mesai Bitti'}</span></div>
          <div className="stat-row"><span className="stat-label">Mod</span><span className="stat-value">{charState.toUpperCase()}</span></div>
        </div>

        <div className="team-section">
          <div className="task-list-title">👥 EKİPLER</div>
          {ekipler.map(ekip => (
            <div key={ekip.id} className="team-card" style={{ borderColor: `${ekip.color}22` }}>
              <div className="team-header">
                <span className="team-name" style={{ color: ekip.color }}>{ekip.name}</span>
                <span className="team-status">{isWorkHours ? ekip.status : 'Molada'}</span>
              </div>
              <div className="team-meta" style={{ color: ekip.color + '88', fontSize: '10px', marginTop: '3px' }}>
                {ekip.tasks[0]}
              </div>
            </div>
          ))}
          <div className="stat-row" style={{marginTop: '10px'}}><span className="stat-label">İş Ortağı</span><span className="stat-value active">VOLDEMORT</span></div>
        </div>

        {/* MÜDÜRİYE GÖREV DÖNGÜSÜ açıklaması */}
        <div className="muduriye-legend">
          <div className="legend-title">🏛 MÜDÜRİYE DÖNGÜSÜ</div>
          <div className="legend-item test">📋 GÖREV — Yeni görev alındı</div>
          <div className="legend-item report">🧙 VOLDEMORT — Öneri danışıldı</div>
          <div className="legend-item commit">⚙️ UYGULA → 🧪 TEST et</div>
          <div className="legend-item push">💾 COMMIT → 🚀 PUSH</div>
          <div className="legend-item test">📊 RAPOR — Müdüre bildir</div>
        </div>
      </div>

      <div className="main-area">
        <div className="top-bar">
          <div className="top-bar-left">
            <span className="top-bar-title">OPERASYON MERKEZİ</span>
            <span className="top-bar-badge"><span className="live-dot"/>CANLI</span>
            <span className="top-bar-badge muduriye-badge">🏛 MÜDÜRİYE AKTİF</span>
          </div>
          <div className="top-bar-right">
            <span>Müdür-Agent</span><span>|</span><span>{saat}</span>
          </div>
        </div>

        <div className="office-scene">
          <div className="scene-bg">
            {Array.from({length:8},(_,i) => <div key={`h${i}`} className="grid-line grid-h" style={{top:`${(i+1)*12}%`}}/>)}
            {Array.from({length:12},(_,i) => <div key={`v${i}`} className="grid-line grid-v" style={{left:`${(i+1)*8}%`}}/>)}
          </div>

          <div className="office-room">
            <div className="floor">
              {Array.from({length:10},(_,i) => <div key={i} className="floor-tile" style={{left:`${i*10}%`,width:'10%'}}/>)}
            </div>

            {/* Alt Ekip Agentları */}
            <div className="sub-agents-row">
              <EkipAgent name="Frontend Team" color="#3498db" delay={0} isWorkHours={isWorkHours} />
              <EkipAgent name="Backend Team" color="#2ecc71" delay={0.5} isWorkHours={isWorkHours} />
              <EkipAgent name="AI Team" color="#9b59b6" delay={1} isWorkHours={isWorkHours} />
            </div>

            {/* MÜDÜRİYE DEPARTMANI — aktif, VOLDEMORT danışma döngüsü */}
            <div className="muduriye-department">
              <div className="muduriye-sign">🏛 MÜDÜRİYE <span className="muduriye-active-badge">AKTİF</span></div>
              <div className="muduriye-divider" />
              <MuduriyeManager />
            </div>

            <div className="wall-frame"><span className="wall-frame-text">YAPGITSIN HQ</span></div>
            <Pencere/>

            <div className="office-staff">
              <DeveloperAgent isWorkHours={isWorkHours} />
            </div>

            <div className="desk"><div className="desk-leg left"/><div className="desk-leg right"/></div>
            <div className="monitor"><MonitorEkrani/></div>
            <Klavye aktif={isTyping && isWorkHours}/>

            <div
              className={`character ${isWalking ? 'walking' : ''} ${isTyping ? 'typing' : ''} ${!isWorkHours ? 'resting' : ''}`}
              style={{
                transform: `translate(calc(-50% + ${charX}px), ${charY}px) translateX(5px)`,
                transition: isWalking ? 'transform 2s ease-in-out' : 'transform 1.2s ease-out',
                zIndex: charY < 0 ? 1 : 5
              }}
            >
              <div className={`popup-bubble ${popupGorunur ? 'visible' : ''}`}>
                <span className="popup-icon">{mesaj.icon}</span>
                {mesaj.text}
              </div>
              <div className="char-head">
                <div className="char-hair"/>
                <div className="char-glasses"/>
                <div className="char-eye left"/><div className="char-eye right"/>
              </div>
              <div className="char-body">
                <div className="char-collar"/><div className="char-tie"/>
                <div className="char-arm left"><div className="char-hand"/></div>
                <div className="char-arm right"><div className="char-hand"/></div>
              </div>
              <div className="char-legs">
                <div className={`char-leg-l ${isWalking ? 'walk' : ''}`}/>
                <div className={`char-leg-r ${isWalking ? 'walk' : ''}`}/>
              </div>
              <div className="manager-label">AGENT MÜDÜR</div>
            </div>
          </div>
        </div>

        <div className="console-bar" ref={konsolRef}>
          {konsol.map((c,i) => (
            <div className="console-line" key={i}>
              <span className="console-ts">[{c.ts}]</span>
              <span className={`console-level ${c.level}`}>{c.level.toUpperCase()}</span>
              <span className="console-msg">{c.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
