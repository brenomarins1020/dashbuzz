import { memo, useEffect, useRef } from "react";

interface FloatingItem {
  type: "calendar" | "pen" | "note" | "star" | "circle";
  x: number;
  y: number;
  size: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  delay: number;
  speed: number;
  fadeSpeed: number;
}

const ITEMS: FloatingItem[] = [
  { type: "calendar", x: 5,  y: 8,  size: 140, rotX: 25,  rotY: -20, rotZ: -12, delay: 0,   speed: 0.4,  fadeSpeed: 0.08 },
  { type: "pen",      x: 78, y: 5,  size: 130, rotX: -15, rotY: 25,  rotZ: 8,   delay: 1.5, speed: 0.35, fadeSpeed: 0.06 },
  { type: "note",     x: 88, y: 60, size: 120, rotX: 20,  rotY: -30, rotZ: 15,  delay: 0.8, speed: 0.3,  fadeSpeed: 0.07 },
  { type: "star",     x: 82, y: 85, size: 80,  rotX: 10,  rotY: -10, rotZ: 5,   delay: 2,   speed: 0.55, fadeSpeed: 0.1  },
  { type: "circle",   x: 8,  y: 75, size: 100, rotX: -10, rotY: 20,  rotZ: -15, delay: 1.3, speed: 0.42, fadeSpeed: 0.08 },
  { type: "pen",      x: 3,  y: 42, size: 160, rotX: -20, rotY: 10,  rotZ: -35, delay: 0.3, speed: 0.45, fadeSpeed: 0.05 },
  { type: "star",     x: 45, y: 6,  size: 70,  rotX: 5,   rotY: -5,  rotZ: 10,  delay: 0,   speed: 0.6,  fadeSpeed: 0.1  },
  { type: "circle",   x: 55, y: 88, size: 90,  rotX: 15,  rotY: 10,  rotZ: 20,  delay: 0.7, speed: 0.48, fadeSpeed: 0.06 },
  { type: "calendar", x: 25, y: 25, size: 110, rotX: 10,  rotY: -5,  rotZ: -8,  delay: 0.5, speed: 0.5,  fadeSpeed: 0.07 },
  { type: "note",     x: 65, y: 20, size: 100, rotX: -8,  rotY: 15,  rotZ: 12,  delay: 1.8, speed: 0.36, fadeSpeed: 0.08 },
  { type: "pen",      x: 18, y: 55, size: 120, rotX: 12,  rotY: -20, rotZ: -5,  delay: 4.5, speed: 0.4,  fadeSpeed: 0.05 },
  { type: "calendar", x: 70, y: 70, size: 130, rotX: -5,  rotY: 5,   rotZ: -8,  delay: 3.5, speed: 0.38, fadeSpeed: 0.09 },
  { type: "note",     x: 40, y: 78, size: 110, rotX: 8,   rotY: -8,  rotZ: 5,   delay: 2.8, speed: 0.42, fadeSpeed: 0.06 },
  { type: "star",     x: 92, y: 35, size: 60,  rotX: -12, rotY: 18,  rotZ: -10, delay: 1,   speed: 0.5,  fadeSpeed: 0.11 },
];

const COLORS = {
  calendar: { fill: "rgba(74,144,217,0.15)", stroke: "rgba(74,144,217,0.5)", accent: "#4A90D9", light: "rgba(74,144,217,0.35)" },
  pen: { fill: "rgba(245,166,35,0.15)", stroke: "rgba(245,166,35,0.5)", accent: "#F5A623", light: "rgba(245,166,35,0.35)" },
  note: { fill: "rgba(45,212,191,0.15)", stroke: "rgba(45,212,191,0.5)", accent: "#2DD4BF", light: "rgba(45,212,191,0.35)" },
  star: { fill: "rgba(251,191,36,0.2)", stroke: "rgba(251,191,36,0.6)", accent: "#FBBF24", light: "rgba(251,191,36,0.4)" },
  circle: { fill: "rgba(167,139,250,0.15)", stroke: "rgba(167,139,250,0.5)", accent: "#A78BFA", light: "rgba(167,139,250,0.35)" },
};

function CalendarSVG({ size, color }: { size: number; color: typeof COLORS.calendar }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <rect x="4" y="10" width="52" height="44" rx="6" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <rect x="4" y="10" width="52" height="14" rx="6" fill={color.light} />
      <rect x="16" y="4" width="3" height="12" rx="1.5" fill={color.stroke} />
      <rect x="41" y="4" width="3" height="12" rx="1.5" fill={color.stroke} />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x={10 + (i % 7) * 6} y="30" width="3.5" height="3.5" rx="0.8" fill={color.light} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={`r2-${i}`} x={10 + (i % 7) * 6} y="38" width="3.5" height="3.5" rx="0.8" fill={color.fill} />
      ))}
      <text x="30" y="21" textAnchor="middle" fill={color.accent} fontSize="6" fontWeight="700" fontFamily="Syne, sans-serif">MAR</text>
    </svg>
  );
}

function PenSVG({ size, color }: { size: number; color: typeof COLORS.calendar }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 68" fill="none">
      <rect x="18" y="8" width="24" height="54" rx="3" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <rect x="22" y="8" width="16" height="8" rx="2" fill={color.light} />
    </svg>
  );
}

function NoteSVG({ size, color }: { size: number; color: typeof COLORS.note }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 70" fill="none">
      <rect x="4" y="4" width="52" height="62" rx="6" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <path d="M40 4 L56 20 L40 20 Z" fill={color.light} />
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x="12" y={28 + i * 10} width={32 - i * 4} height="2.5" rx="1.2" fill={color.fill} />
      ))}
    </svg>
  );
}

function StarSVG({ size, color }: { size: number; color: typeof COLORS.star }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <path
        d="M15 2 L18.5 11 L28 11 L20.5 17 L23 26 L15 21 L7 26 L9.5 17 L2 11 L11.5 11 Z"
        fill={color.light}
        stroke={color.stroke}
        strokeWidth="1"
      />
    </svg>
  );
}

function CircleSVG({ size, color }: { size: number; color: typeof COLORS.circle }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="16" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="8" fill={color.light} />
    </svg>
  );
}

function AnimatedItem({ item }: { item: FloatingItem }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    const start = performance.now() - item.delay * 1000;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const el = ref.current;
      if (!el) { frame = requestAnimationFrame(tick); return; }

      const s = item.speed;
      const tx = Math.sin(t * s * 0.7) * 20;
      const ty = Math.cos(t * s * 0.5) * 15;
      const rx = item.rotX + Math.sin(t * s * 0.3) * 15;
      const ry = item.rotY + Math.cos(t * s * 0.4) * 15;
      const rz = item.rotZ + Math.sin(t * s * 0.25) * 10;
      const opacity = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * item.fadeSpeed * 2 * Math.PI));

      el.style.transform = `translate(${tx}px, ${ty}px) perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      el.style.opacity = String(opacity);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [item]);

  const color = COLORS[item.type];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: `${item.x}%`,
        top: `${item.y}%`,
        willChange: "transform, opacity",
        opacity: 0,
      }}
    >
      {item.type === "calendar" && <CalendarSVG size={item.size} color={color} />}
      {item.type === "pen" && <PenSVG size={item.size} color={color} />}
      {item.type === "note" && <NoteSVG size={item.size} color={color} />}
      {item.type === "star" && <StarSVG size={item.size} color={color} />}
      {item.type === "circle" && <CircleSVG size={item.size} color={color} />}
    </div>
  );
}

export const FloatingElements = memo(function FloatingElements() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ perspective: "600px" }}>
      {ITEMS.map((item, i) => (
        <AnimatedItem key={i} item={item} />
      ))}
    </div>
  );
});
