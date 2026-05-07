import { useState, useEffect } from 'react';
import { subAgentMesajlariDetay, muduriyeFazlari, muduriyeGorevler } from '../data';

export function EkipAgent({ name, color, delay, isWorkHours }: { name: string, color: string, delay: number, isWorkHours: boolean }) {
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

export function DeveloperAgent({ isWorkHours }: { isWorkHours: boolean }) {
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

export function MuduriyeManager() {
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
        <div className="muduriye-mini-agent">
          <div className="muduriye-mini-dot" style={{ backgroundColor: faz.color, boxShadow: `0 0 6px ${faz.color}` }} />
          <div className="muduriye-mini-screen" style={{ borderColor: faz.color }} />
          <div className="muduriye-mini-label">Görev Ajanı</div>
        </div>
        <div className="muduriye-mini-agent">
          <div className="muduriye-mini-dot" style={{ backgroundColor: fazIndex === 6 ? '#e74c3c' : '#374151', boxShadow: fazIndex === 6 ? '0 0 6px #e74c3c' : 'none' }} />
          <div className="muduriye-mini-screen" style={{ borderColor: fazIndex === 6 ? '#e74c3c' : '#374151' }} />
          <div className="muduriye-mini-label">Rapor Ajanı</div>
        </div>
      </div>
    </div>
  );
}
