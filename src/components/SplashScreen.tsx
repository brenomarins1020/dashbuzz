import { useState, useEffect, memo } from "react";

const FLOAT_ITEMS = [
  { type: "calendar", x: 5, y: 8, size: 80, rot: -15, delay: 0, dur: 6 },
  { type: "phone", x: 82, y: 12, size: 60, rot: 20, delay: 1.2, dur: 7 },
  { type: "doc", x: 15, y: 75, size: 70, rot: 10, delay: 0.5, dur: 5.5 },
  { type: "star", x: 88, y: 70, size: 50, rot: -25, delay: 2, dur: 8 },
  { type: "bolt", x: 45, y: 5, size: 45, rot: 30, delay: 0.8, dur: 6.5 },
  { type: "plane", x: 70, y: 85, size: 55, rot: -10, delay: 1.5, dur: 7.5 },
  { type: "circle", x: 92, y: 40, size: 40, rot: 0, delay: 0.3, dur: 5 },
  { type: "calendar", x: 60, y: 90, size: 65, rot: 15, delay: 2.5, dur: 6 },
  { type: "phone", x: 8, y: 45, size: 50, rot: -20, delay: 1, dur: 7 },
  { type: "doc", x: 75, y: 30, size: 55, rot: 25, delay: 0.7, dur: 5.8 },
  { type: "star", x: 30, y: 15, size: 35, rot: -5, delay: 1.8, dur: 8.5 },
  { type: "bolt", x: 20, y: 55, size: 40, rot: 12, delay: 2.2, dur: 6.2 },
  { type: "plane", x: 50, y: 65, size: 45, rot: -30, delay: 0.4, dur: 7.2 },
  { type: "circle", x: 35, y: 88, size: 55, rot: 8, delay: 1.6, dur: 5.3 },
];

function CalendarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PhoneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function DocIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function BoltIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PlaneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CircleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ size: number }>> = {
  calendar: CalendarIcon,
  phone: PhoneIcon,
  doc: DocIcon,
  star: StarIcon,
  bolt: BoltIcon,
  plane: PlaneIcon,
  circle: CircleIcon,
};

const FloatingItem = memo(function FloatingItem({ item }: { item: typeof FLOAT_ITEMS[0] }) {
  const Icon = ICON_MAP[item.type];
  const opacity = 0.15 + Math.random() * 0.25;

  return (
    <div
      className="absolute text-white/30"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        opacity,
        transform: `rotate(${item.rot}deg)`,
        animation: `splash-float ${item.dur}s ease-in-out ${item.delay}s infinite`,
      }}
    >
      <Icon size={item.size} />
    </div>
  );
});

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase("fading"), 2000);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (phase === "fading") {
      const fadeTimer = setTimeout(() => {
        setPhase("done");
        onFinished();
      }, 1500);
      return () => clearTimeout(fadeTimer);
    }
  }, [phase, onFinished]);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#0f1b2d",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 1.5s ease-in-out",
      }}
    >
      {/* Floating icons */}
      {FLOAT_ITEMS.map((item, i) => (
        <FloatingItem key={i} item={item} />
      ))}

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-16 h-px bg-accent" />
        <h1 className="text-5xl md:text-7xl font-bold tracking-[0.35em] uppercase text-white font-heading">
          {localStorage.getItem("onboardingName") || "PROJEC"}
        </h1>
        <div className="w-16 h-px bg-accent" />
        <p className="text-[11px] tracking-[0.5em] uppercase text-white/60 mt-2">
          Marketing Dashboard
        </p>
      </div>
    </div>
  );
}
