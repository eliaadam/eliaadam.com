import { NavLink } from "react-router-dom";
import type { Actor } from "../../lib/maicore-sdk";
import { navItems } from "../navigations/navigation";

interface DesktopSidebarProps {
  activeTab: string | null;
  isAdmin: boolean;
  actor: Actor | null | undefined;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export function DesktopSidebar({
  activeTab,
  isAdmin,
  actor,
  onSelectTab,
  onLogout,
}: DesktopSidebarProps) {
  return (
    <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex-col">
      <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-base font-bold text-black dark:text-white">
          Sonic
        </span>
      </div>

      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => onSelectTab(item.tab)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
              activeTab === item.tab
                ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <SidebarUserFooter actor={actor} isAdmin={isAdmin} onLogout={onLogout} />
    </aside>
  );
}

interface SidebarUserFooterProps {
  actor: Actor | null | undefined;
  isAdmin: boolean;
  onLogout: () => void;
}

function SidebarUserFooter({
  actor,
  isAdmin,
  onLogout,
}: SidebarUserFooterProps) {
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {actor?.display_name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-black dark:text-white truncate m-0">
            {actor?.display_name}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-600 m-0">
            {actor?.code ?? ""}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {isAdmin && (
          <NavLink
            to="/admin"
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
          >
            ⌘ System Admin
          </NavLink>
        )}
        <button
          onClick={onLogout}
          className="text-left text-xs text-neutral-400 hover:text-black dark:hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
