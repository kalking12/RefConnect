import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[#c8ddd7] bg-white px-3 text-xs font-bold text-[#315e53] shadow-[0_10px_24px_-14px_rgba(13,60,51,.45)] transition hover:border-[#81b9a9] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4 text-[#d79b30]" /> : <Moon className="h-4 w-4 text-[#0b746b]" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
