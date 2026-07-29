import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 bg-black text-white flex flex-col">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-6 border-b border-neutral-800">
          <span className="text-[22px]">◈</span>
          <span className="text-base font-bold tracking-tight">
            Maicore Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-black">
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

      {/* Scrollable content */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-black">
        <Outlet />
      </main>
    </div>
  );
}
