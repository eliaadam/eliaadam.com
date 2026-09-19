// NavDisplayContext.tsx — cycle order added
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type NavDisplayMode = "icons" | "icons-label" | "label";

const STORAGE_KEY = "sonicpesa.nav-display-mode";

// Fixed cycle order the single toggle button steps through.
const CYCLE: NavDisplayMode[] = ["icons", "icons-label", "label"];

export function nextNavDisplayMode(mode: NavDisplayMode): NavDisplayMode {
  const index = CYCLE.indexOf(mode);
  return CYCLE[(index + 1) % CYCLE.length];
}

type NavDisplayContextValue = {
  mode: NavDisplayMode;
  setMode: (mode: NavDisplayMode) => void;
  cycle: () => void;
};

const NavDisplayContext = createContext<NavDisplayContextValue | null>(null);

function readStoredMode(): NavDisplayMode {
  if (typeof window === "undefined") return "icons-label";

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "icons" || stored === "icons-label" || stored === "label") {
    return stored;
  }

  return "icons-label";
}

export function NavDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<NavDisplayMode>(readStoredMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const cycle = () => setMode((current) => nextNavDisplayMode(current));

  return (
    <NavDisplayContext.Provider value={{ mode, setMode, cycle }}>
      {children}
    </NavDisplayContext.Provider>
  );
}

export function useNavDisplay() {
  const ctx = useContext(NavDisplayContext);

  if (!ctx) {
    throw new Error("useNavDisplay must be used within a NavDisplayProvider");
  }

  return ctx;
}
