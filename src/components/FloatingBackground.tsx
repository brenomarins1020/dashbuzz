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

// ~10 items positioned at edges/corners (avoiding center x:30-70%, y:30-70%)
const ITEMS: FloatingItem[] = [
  { type: "calendar", x: 4,  y: 6,   size: 120, rotX: 20,  rotY: -15, rotZ: -8,  delay: 0,   speed: 0.25, fadeSpeed: 0.05 },
  { type: "pen",      x: 80, y: 4,   size: 110, rotX: -10, rotY: 20,  rotZ: 6,   delay: 1.2, speed: 0.22, fadeSpeed: 0.04 },
  { type: "note",     x: 90, y: 55,  size: 100, rotX: 15,  rotY: -25, rotZ: 12,  delay: 0.6, speed: 0.2,  fadeSpeed: 0.05 },
  { type: "star",     x: 85, y: 88,  size: 60,  rotX: 8,   rotY: -8,  rotZ: 4,   delay: 1.8, speed: 0.35, fadeSpeed: 0.06 },
  { type: "circle",   x: 6,  y: 80,  size: 80,  rotX: -8,  rotY: 15,  rotZ: -10, delay: 1,   speed: 0.28, fadeSpeed: 0.05 },
  { type: "pen",      x: 2,  y: 40,  size: 130, rotX: -15, rotY: 8,   rotZ: -25, delay: 0.3, speed: 0.3,  fadeSpeed: 0.04 },
  { type: "star",     x: 20, y: 5,   size: 50,  rotX: 5,   rotY: -5,  rotZ: 8,   delay: 0,   speed: 0.38, fadeSpeed: 0.06 },
  { type: "circle",   x: 75, y: 90,  size: 70,  rotX: 12,  rotY: 8,   rotZ: 15,  delay: 0.5, speed: 0.32, fadeSpeed: 0.04 },
  { type: "calendar", x: 92, y: 25,  size: 90,  rotX: 8,   rotY: -5,  rotZ: -6,  delay: 2,   speed: 0.26, fadeSpeed: 0.05 },
  { type: "note",     x: 10, y: 18,  size: 90,  rotX: -6,  rotY: 12,  rotZ: 10,  delay: 1.5, speed: 0.24, fadeSpeed: 0.05 },
];

// Subtle but visible colors for light background
const COLORS = {
  calendar: { fill: "rgba(74,144,217,0.25)", stroke: "rgba(74,144,217,0.40)", accent: "rgba(74,144,217,0.50)", light: "rgba(74,144,217,0.30)" },
  pen:      { fill: "rgba(245,158,11,0.25)",  stroke: "rgba(245,158,11,0.40)",  accent: "rgba(245,158,11,0.50)",  light: "rgba(245,158,11,0.30)" },
  note:     { fill: "rgba(45,212,191,0.25)",  stroke: "rgba(45,212,191,0.40)",  accent: "rgba(45,212,191,0.50)",  light: "rgba(45,212,191,0.30)" },
  star:     { fill: "rgba(245,158,11,0.25)",  stroke: "rgba(245,158,11,0.40)",  accent: "rgba(245,158,11,0.50)",  light: "rgba(245,158,11,0.30)" },
  circle:   { fill: "rgba(167,139,250,0.25)", stroke: "rgba(167,139,250,0.40)", accent: "rgba(167,139,250,0.50)", light: "rgba(167,139,250,0.30)" },
};

type ColorSet = typeof COLORS.calendar;

function CalendarSVG({ size, color }: { size: number; color: ColorSet }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <rect x="4" y="10" width="52" height="44" rx="6" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <rect x="4" y="10" width="52" height="14" rx="6" fill={color.light} />
      <rect x="16" y="4" width="3" height="12" rx="1.5" fill={color.stroke} />
      <rect x="41" y="4" width="3" height="12" rx="1.5" fill={color.stroke} />
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x={10 + (i % 7) * 6} y="30" width="3.5" height="3.5" rx="0.8" fill={color.light} />
      ))}
      <text x="30" y="21" textAnchor="middle" fill={color.accent} fontSize="6" fontWeight="700" fontFamily="Syne, sans-serif">MAR</text>
    </svg>
  );
}

function PenSVG({ size, color }: { size: number; color: ColorSet }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 68" fill="none">
      <rect x="18" y="8" width="24" height="54" rx="3" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <rect x="22" y="8" width="16" height="8" rx="2" fill={color.light} />
    </svg>
  );
}

function NoteSVG({ size, color }: { size: number; color: ColorSet }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 70" fill="none">
      <rect x="4" y="4" width="52" height="62" rx="6" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <path d="M40 4 L56 20 L40 20 Z" fill={color.light} />
      {[0,1,2,3].map(i => (
        <rect key={i} x="12" y={28 + i * 10} width={32 - i * 4} height="2.5" rx="1.2" fill={color.fill} />
      ))}
    </svg>
  );
}

function StarSVG({ size, color }: { size: number; color: ColorSet }) {
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

function CircleSVG({ size, color }: { size: number; color: ColorSet }) {
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
      const tx = Math.sin(t * s * 0.7) * 15;
      const ty = Math.cos(t * s * 0.5) * 10;
      const rx = item.rotX + Math.sin(t * s * 0.3) * 8;
      const ry = item.rotY + Math.cos(t * s * 0.4) * 8;
      const rz = item.rotZ + Math.sin(t * s * 0.25) * 5;
      // Opacity range: 0.10 – 0.18
      const opacity = 0.10 + 0.08 * (0.5 + 0.5 * Math.sin(t * item.fadeSpeed * 2 * Math.PI));

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

export const FloatingBackground = memo(function FloatingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ perspective: "600px" }}>
      {ITEMS.map((item, i) => (
        <AnimatedItem key={i} item={item} />
      ))}
    </div>
  );
});
