import type { ReactNode } from "react";
import type { Capability } from "../types";

export type ShellProps = {
  renderable: Capability[];
  active: string | null;
  goToPanel: (code: string) => void;
  labelFor: (c: Capability) => string;
  iconFor: (c: Capability) => import("lucide-react").LucideIcon;
  children: ReactNode;
  addressBase?: string;
};