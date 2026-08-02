import { NavLink } from "react-router-dom";
import { navItems } from "../navigations/navigation";

interface MobileDrawerProps {
  activeTab: string | null;
  isAdmin: boolean;
  onSelectTab: (tab: string) => void;
  onClose: () => void;
  onLogout: () => void;
}

export function MobileDrawer({
  activeTab,
  isAdmin,
  onSelectTab,
  onClose,
  onLogout,
}: MobileDrawerProps) {
  return (
    <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <nav className="p-2 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => onSelectTab(item.tab)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition ${
              activeTab === item.tab
                ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onClose}
            className="px-3 py-2.5 text-sm text-neutral-500 dark:text-neutral-400"
          >
            ⌘ System Admin
          </NavLink>
        )}
        <button
          onClick={onLogout}
          className="text-left px-3 py-2.5 text-sm text-neutral-400"
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
