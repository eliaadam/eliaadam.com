import { NavLink, Outlet } from "react-router-dom";
import { Clock3, LogOut, User } from "lucide-react";
import { useAuth } from "../context/Authcontext";
import { ThemeToggle } from "../context/ThemeContext";

const navItems = [
  { to: "/dashboard", label: "Recent", icon: Clock3, end: true },
  { to: "/dashboard/profile", label: "Profile", icon: User, end: false },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col justify-between border-b border-slate-200 p-6 dark:border-slate-800 md:border-b-0 md:border-r">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">
              sysc
            </span>
       
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  ].join(" ")
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-500">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <main className="p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
