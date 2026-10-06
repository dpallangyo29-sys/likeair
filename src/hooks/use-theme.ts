import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "likeair-theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("light", theme === "light");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" &&
      localStorage.getItem(KEY)) as Theme | null;
    const initial: Theme = stored ?? "dark";
    setTheme(initial);
    apply(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // localStorage may be unavailable (e.g. private browsing) — theme still applies for this session.
    }
  }

  return { theme, toggle };
}
