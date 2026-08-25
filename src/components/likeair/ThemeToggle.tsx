import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light" : "Switch to dark"}
      className={
        "relative h-9 w-9 grid place-items-center rounded-full bg-surface border border-border overflow-hidden " +
        "transition hover:border-teal/40 active:scale-95 " +
        className
      }
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-coral/10 opacity-0 hover:opacity-100 transition-opacity" />
      {isDark ? <Moon className="h-4 w-4 text-teal" /> : <Sun className="h-4 w-4 text-coral" />}
    </button>
  );
}
