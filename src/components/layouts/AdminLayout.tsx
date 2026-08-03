import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: "/admin", label: "Overview", icon: "⌘" },
  { to: "/admin/actors", label: "Actors", icon: "👤" },
  { to: "/admin/containers", label: "Containers", icon: "📦" },
  { to: "/admin/container-kinds", label: "Container Kinds", icon: "🏷" },
  { to: "/admin/container-templates", label: "Templates", icon: "📋" },
  { to: "/admin/hierarchy-templates", label: "Hierarchies", icon: "🌳" },
  { to: "/admin/roles", label: "Roles & Access", icon: "🔑" },
  { to: "/admin/subscription-plans", label: "Plans", icon: "🎫" },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: "📊" },
  { to: "/admin/vouchers", label: "Vouchers", icon: "🎟" },
  { to: "/admin/questionnaires", label: "Questionnaires", icon: "📝" },
  { to: "/admin/instantiation-requests", label: "Inst. Requests", icon: "📥" },
  { to: "/admin/instantiation-grants", label: "Inst. Grants", icon: "🧩" },
  { to: "/admin/payouts", label: "Payouts", icon: "💸" },
  { to: "/admin/kyc-review", label: "KYC Review", icon: "🪪" },
  { to: "/admin/payment-settings", label: "Payment Settings", icon: "💳" },
  { to: "/admin/registry", label: "Registry", icon: "◈" },
  { to: "/admin/audit", label: "Audit", icon: "◈" },
  { to: "/admin/systemspace", label: "System Space", icon: "◈" },
];

export function AdminLayout() {
  const { actor, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col
          bg-black text-white transition-transform duration-200 ease-in-out
          md:static md:z-auto md:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-2.5 px-5 pt-5 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="text-[22px]">◈</span>
            <span className="text-base font-bold tracking-tight">
              Hala Admin
            </span>
          </div>

          {/* Close button, mobile only */}
          <button
            onClick={closeSidebar}
            className="text-neutral-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white"
                }`
              }
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-black">
              {actor?.display_name?.charAt(0).toUpperCase() ?? "?"}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {actor?.display_name}
              </div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                System Admin
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <NavLink
              to="/home"
              className="block text-sm text-neutral-500 hover:text-neutral-300"
            >
              ← Back to Dashboard
            </NavLink>

            <button
              onClick={logout}
              className="block text-left text-sm text-neutral-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Right side: mobile top bar + scrollable content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 dark:bg-black md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-xl leading-none text-neutral-700 dark:text-neutral-300"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-semibold dark:text-neutral-300">
            Hala Admin
          </span>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
