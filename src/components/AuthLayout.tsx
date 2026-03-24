import { FloatingElements } from "./FloatingElements";
import logoIcon from "@/assets/logo-icon.png";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const displayTitle = title || localStorage.getItem("onboardingName") || "DASHBUZZ";

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Floating 3D elements */}
      <FloatingElements />

      {/* Animated blobs */}
      <div
        className="auth-blob w-[300px] h-[300px] top-[-80px] right-[-60px] opacity-20"
        style={{ background: "#F5A623", animation: "float 20s ease-in-out infinite" }}
      />
      <div
        className="auth-blob w-[250px] h-[250px] bottom-[-100px] left-[-80px] opacity-15"
        style={{ background: "#2a5a9a", animation: "float 25s ease-in-out infinite reverse" }}
      />
      <div
        className="auth-blob w-[200px] h-[200px] top-[40%] left-[60%] opacity-10"
        style={{ background: "#F5A623", animation: "float 18s ease-in-out infinite 3s" }}
      />

      <div className="relative z-10 w-full" style={{ maxWidth: "min(90vw, 480px)" }}>
        <div className="space-y-8">
          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h1
                className="text-xl font-bold tracking-[0.25em] uppercase text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {displayTitle}
              </h1>
              {subtitle && (
                <p
                  className="text-xs text-white/40 mt-1.5 tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Content with slide-up animation */}
          <div style={{ animation: "slide-up-fade 0.3s ease-out forwards" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
