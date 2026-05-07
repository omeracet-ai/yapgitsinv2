"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import './AgentSim.css';
import {
  konsolMesajlari,
  baslangicGorevleri,
  gorevBitirmeMesajlari,
  ekipler,
  simdiSaat,
  type KonsolSatiri,
  type Gorev,
  type CharState,
} from './data';
import { EkipAgent, DeveloperAgent, MuduriyeManager } from './components/Agents';
import { MonitorEkrani, Klavye, Pencere } from './components/OfficeProps';

// API base — iframe içindeyse parent origin'i kullan, yoksa env veya prod default
const API_BASE = (() => {
  const env = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (env) return env;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('yapgitsin.tr')) return `${window.location.protocol}//${host}/backend/main.js`;
  }
  return 'http://localhost:3001';
})();

// Web Audio API ile basit "ping" sesi — ekstra dosya yüklemeye gerek yok
function playPingSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.frequency.value = 880; // A5
    o2.frequency.value = 1320; // E6
    o1.type = 'sine';
    o2.type = 'sine';
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o1.start(); o2.start();
    o1.stop(ctx.currentTime + 0.6);
    o2.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 800);
  } catch {/* ignore — bazı tarayıcılar user-gesture öncesi izin vermez */}
}

function App() {
  const [mesaj, setMesaj] = useState({ icon: '🫡', text: 'Selam Patron! Son görevleri bitiriyorum!' });
  const [popupGorunur, setPopupGorunur] = useState(true);
  const [konsol, setKonsol] = useState<KonsolSatiri[]>([{ ts: simdiSaat(), level: 'info', msg: '🫡 [MÜDÜR] Selam Patron! Son kalan görevleri bitiriyorum — hemen hallediyorum!' }]);
  const [saat, setSaat] = useState(simdiSaat());
  const [charState, setCharState] = useState<CharState>('typing');
  const [charX] = useState(0);
  const [charY] = useState(0);
  const [planUsage, setPlanUsage] = useState(72);
  const [energy, setEnergy] = useState(85);
  const [isWorkHours, setIsWorkHours] = useState(true);
  const [gorevler, setGorevler] = useState<Gorev[]>(baslangicGorevleri);
  const [tumGorevlerBitti, setTumGorevlerBitti] = useState(false);
  const [, setCompletionPhase] = useState(0);
  const [joyLevel, setJoyLevel] = useState(0);
  const [yeniUyeSayisi, setYeniUyeSayisi] = useState(0);
  const lastUserCountRef = useRef<number | null>(null);
  const konsolRef = useRef<HTMLDivElement>(null);

  // ── Yeni üye dinleyicisi: yapgitsin.tr public stats poll'la ─────────────
  // Yeni kullanıcı kaydı geldiğinde Müdür sevinir (joy +2), ses çalar, popup gösterir.
  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/stats/public`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json() as { totalUsers: number };
        const prev = lastUserCountRef.current;
        if (prev !== null && d.totalUsers > prev) {
          const delta = d.totalUsers - prev;
          // 🎉 Yeni üye geldi — Müdür sevinç patlaması
          playPingSound();
          setJoyLevel(j => Math.min(10, j + 2));
          setYeniUyeSayisi(n => n + delta);
          setMesaj({ icon: '🎉', text: `${delta} yeni üye katıldı! Hoş geldiniz! 🎊` });
          setPopupGorunur(true);
          setEnergy(e => Math.min(100, e + 10));
          setCharState('celebrating');
          setKonsol(p => [...p, {
            ts: simdiSaat(),
            level: 'info',
            msg: `🎉 [MÜDÜR] ${delta} yeni üye yapgitsin.tr'ye katıldı! Toplam: ${d.totalUsers}`,
          }]);
          // 8 saniye sonra normal moda dön
          setTimeout(() => setCharState('typing'), 8000);
        }
        lastUserCountRef.current = d.totalUsers;
      } catch {/* network hatası — sessiz geç */}
    };
    void tick();
    const iv = setInterval(tick, 15000); // her 15 sn'de bir
    return () => clearInterval(iv);
  }, []);

  // Joy level zamanla doğal olarak azalsın (her 30 sn -1)
  useEffect(() => {
    const iv = setInterval(() => setJoyLevel(j => Math.max(0, j - 1)), 30000);
    return () => clearInterval(iv);
  }, []);

  // Görev tamamlama animasyonu — her 2 saniyede bir görev bitirir
  useEffect(() => {
    if (tumGorevlerBitti) return;
    let step = 0;
    const kalanGorevIndexleri = baslangicGorevleri
      .map((g, i) => ({ ...g, i }))
      .filter(g => g.status !== 'done')
      .map(g => g.i);

    if (kalanGorevIndexleri.length === 0) {
      setTumGorevlerBitti(true);
      return;
    }

    const initialDelay = setTimeout(() => {
      setCompletionPhase(1);
      setMesaj({ icon: '⚡', text: 'Son görevleri hızlıca bitiriyorum!' });
      setPopupGorunur(true);

      const iv = setInterval(() => {
        if (step < kalanGorevIndexleri.length) {
          const gorevIdx = kalanGorevIndexleri[step];
          setGorevler(prev => prev.map((g, i) =>
            i === gorevIdx ? { ...g, status: 'running' as const, time: 'şimdi...' } : g
          ));
          const logIdx = step * 2;
          if (gorevBitirmeMesajlari[logIdx]) {
            setKonsol(p => [...p, { ts: simdiSaat(), level: gorevBitirmeMesajlari[logIdx].level, msg: gorevBitirmeMesajlari[logIdx].msg }]);
          }
          setMesaj({ icon: '⚡', text: `${baslangicGorevleri[gorevIdx].name} üzerinde çalışıyorum...` });
          setPlanUsage(p => Math.min(98, p + 5));

          setTimeout(() => {
            setGorevler(prev => prev.map((g, i) =>
              i === gorevIdx ? { ...g, status: 'done' as const, time: 'az önce ✅' } : g
            ));
            const doneLogIdx = step * 2 + 1;
            if (gorevBitirmeMesajlari[doneLogIdx]) {
              setKonsol(p => [...p, { ts: simdiSaat(), level: gorevBitirmeMesajlari[doneLogIdx].level, msg: gorevBitirmeMesajlari[doneLogIdx].msg }]);
            }
            setMesaj({ icon: '✅', text: `${baslangicGorevleri[gorevIdx].name} — Bitti!` });
            setEnergy(e => Math.max(20, e - 8));
          }, 1500);

          step++;
        } else {
          clearInterval(iv);
          setTimeout(() => {
            setTumGorevlerBitti(true);
            setCompletionPhase(2);
            setCharState('celebrating');
            setPlanUsage(100);
            setMesaj({ icon: '🏆', text: 'TÜM GÖREVLER TAMAMLANDI! Bugünlük bu kadar patron! 🎉' });
            setPopupGorunur(true);
            setIsWorkHours(false);
            const finalLog = gorevBitirmeMesajlari[gorevBitirmeMesajlari.length - 1];
            setKonsol(p => [...p, { ts: simdiSaat(), level: finalLog.level, msg: finalLog.msg }]);
          }, 2000);
        }
      }, 2500);

      return () => clearInterval(iv);
    }, 2000);

    return () => clearTimeout(initialDelay);
  }, [tumGorevlerBitti]);

  useEffect(() => {
    if (tumGorevlerBitti) return;
    const iv = setInterval(() => {
      if (isWorkHours && charState === 'typing') {
        setEnergy(e => Math.max(0, e - 0.3));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [charState, isWorkHours, tumGorevlerBitti]);

  useEffect(() => {
    const iv = setInterval(() => setSaat(simdiSaat()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!tumGorevlerBitti) return;
    const kutlamaMesajlari = [
      { icon: '🏆', text: 'Tüm görevler bitti! Harika iş çıkardık!' },
      { icon: '🎉', text: 'Ekipler süper çalıştı bugün!' },
      { icon: '☕', text: 'Artık bir kahve hak ettik...' },
      { icon: '💪', text: 'Yarın daha güçlü döneceğiz!' },
      { icon: '📊', text: '7/7 görev tamamlandı — %100 başarı!' },
      { icon: '🫡', text: 'Patron, görev tamam! İyi akşamlar!' },
    ];
    let idx = 0;
    const iv = setInterval(() => {
      setPopupGorunur(false);
      setTimeout(() => {
        setMesaj(kutlamaMesajlari[idx % kutlamaMesajlari.length]);
        setPopupGorunur(true);
        idx++;
      }, 500);
    }, 6000);
    return () => clearInterval(iv);
  }, [tumGorevlerBitti]);

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

  useEffect(() => {
    if (konsolRef.current) {
      konsolRef.current.scrollTop = konsolRef.current.scrollHeight;
    }
  }, [konsol]);

  const isWalking = charState.startsWith('walking');
  const isTyping = charState === 'typing';
  const isCelebrating = charState === 'celebrating';

  // ── Müdüriye disiplini ──────────────────────────────────────────────────
  // Aktif (queued + running) görev sayısına göre Müdüriye'nin durumu:
  //   0 görev  → kapalı (Müdür de boşa bekler)
  //   1 görev  → kapalı, Müdür kendi devralır
  //   2+ görev → açık, Müdür 1'ini devralır, kalanlar Müdüriye'de döner
  const aktifGorevSayisi = gorevler.filter(g => g.status !== 'done').length;
  const muduriyeAktif = aktifGorevSayisi >= 2;
  const mudurDevraldi = aktifGorevSayisi >= 1;
  const muduriyeStatus = aktifGorevSayisi === 0 ? 'KAPALI'
    : muduriyeAktif ? 'AKTİF'
    : 'BEKLEMEDE';

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
            <span>SEVİNÇ {joyLevel >= 6 ? '🎉' : joyLevel >= 3 ? '😄' : joyLevel >= 1 ? '🙂' : '😐'}</span>
            <span>Lv.{joyLevel}/10</span>
          </div>
          <div className="usage-bar-container">
            <div
              className="usage-bar"
              style={{ width: `${joyLevel * 10}%`, background: 'linear-gradient(90deg, #ff6b9d, #f9ca24)' }}
            ></div>
          </div>
          {yeniUyeSayisi > 0 && (
            <div style={{ fontSize: '11px', color: '#f9ca24', marginTop: '4px' }}>
              🎊 Bugün {yeniUyeSayisi} yeni üye!
            </div>
          )}
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

        <div className="team-section">
          <div className="task-list-title">📋 GÖREVLER ({gorevler.filter(g => g.status === 'done').length}/{gorevler.length})</div>
          {gorevler.map((g, i) => (
            <div key={i} className="team-card" style={{
              borderColor: g.status === 'done' ? '#2ecc7144' : g.status === 'running' ? '#f39c1244' : '#374151',
              opacity: g.status === 'done' ? 0.7 : 1
            }}>
              <div className="team-header">
                <span className="team-name" style={{
                  color: g.status === 'done' ? '#2ecc71' : g.status === 'running' ? '#f39c12' : '#6b7280',
                  textDecoration: g.status === 'done' ? 'line-through' : 'none'
                }}>
                  {g.status === 'done' ? '✅' : g.status === 'running' ? '⚡' : '⏳'} {g.name}
                </span>
                <span className="team-status" style={{
                  color: g.status === 'done' ? '#2ecc71' : g.status === 'running' ? '#f39c12' : '#6b7280'
                }}>
                  {g.status === 'done' ? 'Bitti' : g.status === 'running' ? 'Çalışıyor...' : 'Sırada'}
                </span>
              </div>
              <div className="team-meta" style={{ color: '#6b728088', fontSize: '10px', marginTop: '2px' }}>
                {g.time}
              </div>
            </div>
          ))}
          {tumGorevlerBitti && (
            <div style={{
              textAlign: 'center',
              padding: '8px',
              background: 'linear-gradient(135deg, #2ecc7115, #f39c1215)',
              borderRadius: '8px',
              marginTop: '8px',
              fontSize: '11px',
              color: '#2ecc71',
              fontWeight: 'bold',
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}>
              🏆 TÜM GÖREVLER TAMAMLANDI!
            </div>
          )}
        </div>

        <div className="sidebar-stats">
          <div className="stat-row"><span className="stat-label">Durum</span><span className="stat-value active">{tumGorevlerBitti ? '🏆 Görevler Tamam!' : isWorkHours ? '● Mesai Devam' : '○ Mesai Bitti'}</span></div>
          <div className="stat-row"><span className="stat-label">Mod</span><span className="stat-value">{isCelebrating ? '🎉 KUTLAMA' : charState.toUpperCase()}</span></div>
          <div className="stat-row"><span className="stat-label">İlerleme</span><span className="stat-value">{gorevler.filter(g => g.status === 'done').length}/{gorevler.length} görev</span></div>
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
            <span className="top-bar-badge muduriye-badge">{
              tumGorevlerBitti ? '🏆 GÖREVLER TAMAM'
              : muduriyeAktif ? '🏛 MÜDÜRİYE AKTİF'
              : aktifGorevSayisi === 1 ? '☕ MÜDÜR TEK BAŞINA'
              : '🌙 MÜDÜRİYE KAPALI'
            }</span>
            {mudurDevraldi && (
              <span className="top-bar-badge" style={{ background: '#3498db22', color: '#60a5fa' }}>
                📋 Müdür: 1 görev
              </span>
            )}
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

            <div className="sub-agents-row">
              <EkipAgent name="Frontend Team" color="#3498db" delay={0} isWorkHours={isWorkHours} />
              <EkipAgent name="Backend Team" color="#2ecc71" delay={0.5} isWorkHours={isWorkHours} />
              <EkipAgent name="AI Team" color="#9b59b6" delay={1} isWorkHours={isWorkHours} />
            </div>

            {muduriyeAktif ? (
              <div className="muduriye-department">
                <div className="muduriye-sign">
                  🏛 MÜDÜRİYE <span className="muduriye-active-badge">{muduriyeStatus}</span>
                </div>
                <div className="muduriye-divider" />
                <MuduriyeManager />
                <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '4px' }}>
                  Müdür 1 devraldı · Müdüriye'de {aktifGorevSayisi - 1} görev
                </div>
              </div>
            ) : (
              <div className="muduriye-department" style={{ opacity: 0.4 }}>
                <div className="muduriye-sign" style={{ filter: 'grayscale(0.7)' }}>
                  🏛 MÜDÜRİYE <span className="muduriye-active-badge" style={{ background: '#374151' }}>{muduriyeStatus}</span>
                </div>
                <div className="muduriye-divider" />
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                  {aktifGorevSayisi === 0
                    ? '🌙 Görev yok — kapalı'
                    : '☕ Tek görev — Müdür kendi devraldı'}
                </div>
              </div>
            )}

            <div className="wall-frame"><span className="wall-frame-text">YAPGITSIN HQ</span></div>
            <Pencere/>

            <div className="office-staff">
              <DeveloperAgent isWorkHours={isWorkHours} />
            </div>

            <div className="desk"><div className="desk-leg left"/><div className="desk-leg right"/></div>
            <div className="monitor"><MonitorEkrani/></div>
            <Klavye aktif={isTyping && isWorkHours}/>

            <div
              className={`character ${isWalking ? 'walking' : ''} ${isTyping ? 'typing' : ''} ${isCelebrating ? 'celebrating' : ''} ${!isWorkHours && !isCelebrating ? 'resting' : ''}`}
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
export { App as AgentSim };
