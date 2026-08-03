import { useEffect, useState } from "react";
import type { SidebarView } from "../components/navigation/types"; // adjust path

const STORAGE_KEY = "sidebar-view";

function readStored(): SidebarView {
  if (typeof window === "undefined") return "full";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "full" || stored === "text" || stored === "icons" ? stored : "full";
}

export function useSidebarView() {
  const [view, setView] = useState<SidebarView>(readStored);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  return [view, setView] as const;
}