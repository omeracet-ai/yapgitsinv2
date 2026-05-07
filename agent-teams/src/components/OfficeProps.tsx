import { useState, useEffect } from 'react';
import { kodSatirlari } from '../data';

export function MonitorEkrani() {
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

export function Klavye({ aktif }: { aktif: boolean }) {
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

export function Pencere() {
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
