import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/u/discover", label: "Discover", icon: "🔍" },
  { to: "/u/my-containers", label: "My Containers", icon: "📦" },
  { to: "/u/invitations", label: "Invitations", icon: "✉️" },
  { to: "/u/create", label: "Create Organization", icon: "🚀" },
];

export function UserLayout() {
  const { actor, isAdmin, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-[240px] bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-base font-bold text-black dark:text-white">
            Sonic
          </span>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/u"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
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
            <NavLink
              to="/home"
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            >
              Home
            </NavLink>
            <button
              onClick={logout}
              className="text-left text-xs text-neutral-400 hover:text-black dark:hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-neutral-50 dark:bg-neutral-900 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
