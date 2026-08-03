import { PanelLeft, PanelLeftClose, AlignJustify } from "lucide-react";
import type { SidebarView } from "./types";

interface SidebarViewToggleProps {
  view: SidebarView;
  onChange: (view: SidebarView) => void;
}

const OPTIONS: { value: SidebarView; icon: typeof PanelLeft; label: string }[] =
  [
    { value: "full", icon: PanelLeft, label: "Full" },
    { value: "text", icon: AlignJustify, label: "Text only" },
    { value: "icons", icon: PanelLeftClose, label: "Icons only" },
  ];

export function SidebarViewToggle({ view, onChange }: SidebarViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === view;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition ${
              active
                ? "bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm"
                : "text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
