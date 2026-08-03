import { NavLink } from "react-router-dom";
import { Command, LogOut } from "lucide-react";

import type { SidebarView } from "./types";
import type { Actor } from "../../lib/maicore-sdk";

interface SidebarUserFooterProps {
  actor: Actor | null | undefined;
  isAdmin: boolean;
  onLogout: () => void;
  view?: SidebarView;
}

export function SidebarUserFooter({
  actor,
  isAdmin,
  onLogout,
  view = "full",
}: SidebarUserFooterProps) {
  const showLabel = view !== "icons";

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
      <div
        className={`flex items-center gap-2.5 ${showLabel ? "px-2" : "justify-center"}`}
      >
        <div className="w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {actor?.display_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        {showLabel && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-black dark:text-white truncate m-0">
              {actor?.display_name}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600 m-0">
              {actor?.code ?? ""}
            </p>
          </div>
        )}
      </div>
      <div
        className={`flex flex-col gap-1 ${showLabel ? "px-2" : "items-center"}`}
      >
        {isAdmin && (
          <NavLink
            to="/admin"
            title={!showLabel ? "System Admin" : undefined}
            className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <Command size={14} className="flex-shrink-0" />
            {showLabel && "System Admin"}
          </NavLink>
        )}
        <button
          onClick={onLogout}
          title={!showLabel ? "Sign out" : undefined}
          className="flex items-center gap-1.5 text-left text-xs text-neutral-400 hover:text-black dark:hover:text-white"
        >
          <LogOut size={14} className="flex-shrink-0" />
          {showLabel && "Sign out"}
        </button>
      </div>
    </div>
  );
}
