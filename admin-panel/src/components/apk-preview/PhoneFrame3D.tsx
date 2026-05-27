"use client";

/**
 * PhoneFrame3D — Mouse/touch ile rotateY/rotateX interactive phone mockup.
 * Reset (↺) ve Sabitle (🔒) toggle ile manuel kilit. Smooth transition.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface Props {
  width: number;
  height: number;
  /** Çerçeve dış border radius (default 60) */
  bezelRadius?: number;
  /** Çerçeve iç padding (default 14) */
  bezelPadding?: number;
  /** Cihaz çerçeve rengi class adı (default bg-slate-800) */
  bezelClassName?: string;
  /** Ekran çocuk içeriği (status bar + body + tab bar zaten içeride değil). */
  children: ReactNode;
  /** Başlangıç rotateY (default -8) */
  initialRotateY?: number;
  /** Başlangıç rotateX (default 4) */
  initialRotateX?: number;
  /** Kontrol bar gösterimi (default true) */
  showControls?: boolean;
}

const CLAMP = 25;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function PhoneFrame3D({
  width,
  height,
  bezelRadius = 60,
  bezelPadding = 14,
  bezelClassName = "bg-slate-800 shadow-2xl shadow-black/60",
  children,
  initialRotateY = -8,
  initialRotateX = 4,
  showControls = true,
}: Props) {
  const [rotY, setRotY] = useState(initialRotateY);
  const [rotX, setRotX] = useState(initialRotateX);
  const [locked, setLocked] = useState(false);
  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const onStart = useCallback(
    (x: number, y: number) => {
      if (locked) return;
      draggingRef.current = true;
      lastRef.current = { x, y };
    },
    [locked],
  );

  const onMove = useCallback(
    (x: number, y: number) => {
      if (!draggingRef.current || !lastRef.current) return;
      const dx = x - lastRef.current.x;
      const dy = y - lastRef.current.y;
      lastRef.current = { x, y };
      setRotY((prev) => clamp(prev + dx * 0.4, -CLAMP, CLAMP));
      setRotX((prev) => clamp(prev - dy * 0.4, -CLAMP, CLAMP));
    },
    [],
  );

  const onEnd = useCallback(() => {
    draggingRef.current = false;
    lastRef.current = null;
  }, []);

  // Global mouse listeners — pointer leaves the element while dragging.
  useEffect(() => {
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const mu = () => onEnd();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
    };
  }, [onMove, onEnd]);

  const reset = useCallback(() => {
    setRotY(initialRotateY);
    setRotX(initialRotateX);
  }, [initialRotateY, initialRotateX]);

  const wrapperStyle: CSSProperties = {
    transform: `perspective(1200px) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
    transition: draggingRef.current ? "none" : "transform 100ms ease-out",
    cursor: locked ? "default" : draggingRef.current ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
  };

  const bezelStyle: CSSProperties = {
    width,
    height,
    borderRadius: bezelRadius,
    padding: bezelPadding,
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="animate-in zoom-in-95 fade-in duration-300"
        style={wrapperStyle}
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) onStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) onMove(t.clientX, t.clientY);
        }}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
      >
        <div className={bezelClassName} style={bezelStyle}>
          {children}
        </div>
      </div>
      {showControls && (
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={reset}
            className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition"
            title="Açıyı sıfırla"
          >
            ↺ Sıfırla
          </button>
          <button
            type="button"
            onClick={() => setLocked((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
              locked
                ? "bg-amber-500/20 text-amber-200 border-amber-400/30"
                : "bg-white/10 hover:bg-white/20 text-white border-white/15"
            }`}
            title={locked ? "Kilit açık" : "Sabitle"}
          >
            {locked ? "🔒 Kilitli" : "🔓 Sabitle"}
          </button>
          <span className="text-[10px] text-white/50">
            sürükle · Y:{rotY.toFixed(0)}° X:{rotX.toFixed(0)}°
          </span>
        </div>
      )}
    </div>
  );
}
