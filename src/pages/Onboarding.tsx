import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingBackground } from "@/components/FloatingBackground";
import { LayoutDashboard, CalendarDays, ListChecks, BarChart3 } from "lucide-react";

const dmSans = { fontFamily: "'DM Sans', sans-serif" };

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

const slides: Slide[] = [
  {
    icon: <LayoutDashboard className="h-9 w-9" />,
    title: "Bem-vindo ao DashBuzz",
    description: "O dashboard de marketing feito para\nEmpresas Juniores e Atléticas.\nTudo em um só lugar.",
    accent: "#F59E0B",
  },
  {
    icon: <CalendarDays className="h-9 w-9" />,
    title: "Calendário de conteúdo",
    description: "Planeje e visualize todas as suas\npublicações, stories e compromissos\nem um calendário unificado.",
    accent: "#60a5fa",
  },
  {
    icon: <ListChecks className="h-9 w-9" />,
    title: "Tarefas e equipe",
    description: "Distribua tarefas entre os membros,\nacompanhe o progresso e mantenha\ntodo o time alinhado.",
    accent: "#34d399",
  },
  {
    icon: <BarChart3 className="h-9 w-9" />,
    title: "Dados e presenças",
    description: "Acompanhe métricas de conteúdo\ne controle a presença da equipe\nnas reuniões em tempo real.",
    accent: "#a78bfa",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | "none">("none");

  useEffect(() => {
    if (localStorage.getItem("onboarding_seen") === "1") {
      navigate("/welcome", { replace: true });
    }
  }, [navigate]);

  const finish = () => {
    localStorage.setItem("onboarding_seen", "1");
    navigate("/welcome", { replace: true });
  };

  const goTo = (idx: number) => {
    if (transitioning || idx === current) return;
    const forward = idx > current;
    setSlideDir(forward ? "left" : "right");
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setSlideDir(forward ? "right" : "left");
      requestAnimationFrame(() => {
        setSlideDir("none");
        setTransitioning(false);
      });
    }, 200);
  };

  const next = () => {
    if (current === slides.length - 1) {
      finish();
    } else {
      goTo(current + 1);
    }
  };

  const slide = slides[current];

  const contentStyle: React.CSSProperties = transitioning
    ? {
        transform: slideDir === "left" ? "translateX(-24px)" : "translateX(24px)",
        opacity: 0,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      }
    : {
        transform: "translateX(0)",
        opacity: 1,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: "#0f172a" }}
    >
      <FloatingBackground />
    <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen px-6"
    >
      {/* Skip button */}
      <button
        onClick={finish}
        className="absolute top-4 right-4 text-sm px-3 py-1.5 rounded-lg"
        style={{ color: "rgba(255,255,255,0.4)", ...dmSans, WebkitTapHighlightColor: "transparent" }}
      >
        Pular
      </button>

      <div className="flex flex-col items-center max-w-xs w-full" style={contentStyle}>
        {/* Icon */}
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `${slide.accent}1F`,
            border: `1.5px solid ${slide.accent}40`,
            color: slide.accent,
          }}
        >
          {slide.icon}
        </div>

        {/* Title */}
        <h2
          className="text-[22px] font-bold text-white text-center mb-3"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {slide.title}
        </h2>

        {/* Description */}
        <p
          className="text-sm text-center leading-[1.7]"
          style={{ color: "rgba(255,255,255,0.55)", whiteSpace: "pre-line", maxWidth: 280, ...dmSans }}
        >
          {slide.description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 mt-10 mb-8">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              background: i === current ? "#F59E0B" : "rgba(255,255,255,0.2)",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={next}
        className="btn-gold-shimmer w-full h-12 rounded-2xl text-sm font-semibold max-w-xs"
        style={{ ...dmSans, WebkitTapHighlightColor: "transparent" }}
      >
        {current === slides.length - 1 ? "Começar" : "Próximo"}
      </button>
    </div>
    </div>
  );
}
