"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync React state with what FOUC script already applied to the DOM
  useEffect(() => {
    const stored = localStorage.getItem("wsm-theme") as Theme | null;
    const sys: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = stored ?? sys;
    setTheme(initial);
    // Ensure DOM matches (FOUC script may have already done this, but be safe)
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    // Read actual DOM state as source of truth to avoid stale-closure bugs
    const isDark = document.documentElement.classList.contains("dark");
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", !isDark);
    localStorage.setItem("wsm-theme", next);
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
