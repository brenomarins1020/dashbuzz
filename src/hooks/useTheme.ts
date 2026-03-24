import { useState, useEffect, useCallback } from "react";

// Apply theme class immediately to prevent FOUC
const storedTheme = (typeof window !== "undefined" && localStorage.getItem("app-theme")) as "light" | "dark" | null;
if (storedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(storedTheme || "light");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme };
}
