import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";

/**
 * Automatic light/dark support: on first load, follows the OS/browser
 * preference (`prefers-color-scheme`) rather than defaulting to one
 * fixed theme. Once someone manually toggles it, that explicit choice
 * is persisted to localStorage and takes over — the app stops
 * following the OS preference for that person from then on, same
 * "manual override wins" convention `ContainerContext` uses for its
 * own persisted selection.
 *
 * If no manual choice was ever made, the app keeps LIVE-following the
 * OS preference (a `matchMedia` change listener), so switching your
 * system theme while the app is open updates it immediately.
 */

const STORAGE_KEY = "maicore.theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => getStoredTheme() ?? getSystemTheme(),
  );
  const [hasManualPreference, setHasManualPreference] = useState<boolean>(
    () => getStoredTheme() !== null,
  );

  // Apply the theme class immediately, and on every change. Also adds
  // a short transition on the root element so switching themes fades
  // rather than flashes — removed and re-added around the change so
  // it doesn't apply to the very first paint.
  useEffect(() => {
    document.documentElement.style.transition =
      "background-color 200ms ease, color 200ms ease";
    applyThemeClass(theme);
  }, [theme]);

  // Live-follow the OS preference for as long as no manual choice has
  // been made.
  useEffect(() => {
    if (hasManualPreference) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [hasManualPreference]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    setHasManualPreference(true);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-black dark:text-neutral-500 dark:hover:bg-neutral-900 dark:hover:text-white"
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
