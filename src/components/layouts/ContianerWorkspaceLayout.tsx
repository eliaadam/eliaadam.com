import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { tab: "dashboard", label: "Stats", icon: "📊" },
  { tab: "home", label: "Feeds", icon: "🏠" },
  { tab: "apps", label: "Marketplace", icon: "📦" },
  { tab: "invitations", label: "Invitations", icon: "✉️" },
  { tab: "profile", label: "Manage", icon: "👤" },
  { tab: "create", label: "Developer", icon: "🚀" },
];

export function ContianerWorkspaceLayout() {
  const { actor, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const activeTab =
    location.pathname === "/home" ? (params.get("tab") ?? "dashboard") : null;

  const goToTab = (tab: string) => {
    navigate(`/home?tab=${tab}`);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <span className="text-base font-bold text-black dark:text-white">
          Platform
        </span>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <nav className="p-2 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.tab}
                onClick={() => goToTab(item.tab)}
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
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm text-neutral-500 dark:text-neutral-400"
              >
                ⌘ System Admin
              </NavLink>
            )}
            <button
              onClick={logout}
              className="text-left px-3 py-2.5 text-sm text-neutral-400"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex-col">
        <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-base font-bold text-black dark:text-white">
            Platform
          </span>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => goToTab(item.tab)}
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
              onClick={logout}
              className="text-left text-xs text-neutral-400 hover:text-black dark:hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-neutral-50 dark:bg-neutral-950  overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
