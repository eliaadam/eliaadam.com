import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Command, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { Actor } from "../../lib/system-sdk";

interface UserMenuProps {
  actor: Actor | null | undefined;
  isAdmin: boolean;
  onLogout: () => void;
}

export function UserMenu({ actor, isAdmin, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside([triggerRef, panelRef], () => setOpen(false), open);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {actor?.display_name?.charAt(0).toUpperCase() ?? "?"}
        </span>
        <ChevronDown size={14} className="text-neutral-400" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg py-1.5 z-50"
        >
          <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-900">
            <p className="text-sm font-medium text-black dark:text-white truncate m-0">
              {actor?.display_name}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600 m-0">
              {actor?.code ?? ""}
            </p>
          </div>

          <NavLink
            to="/home?tab=profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <UserIcon size={15} />
            Profile
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <Command size={15} />
              System Admin
            </NavLink>
          )}

          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
