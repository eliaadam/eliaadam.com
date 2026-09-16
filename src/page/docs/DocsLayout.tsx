import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

/**
 * Public docs shell — /docs and its 7 sub-routes. Deliberately outside
 * the authenticated /dashboard/* tree: this is meant to be reachable
 * by anyone, including a developer who hasn't created an account yet
 * (see the "Account creation" section itself). No ContainerContext,
 * no auth — every page under here is static content.
 *
 * Desktop: persistent left sidebar. Mobile: hamburger + slide-in
 * drawer with a backdrop, same interaction pattern as
 * DashboardLayout's own mobile nav (auto-closes on any link click).
 */

const SECTIONS: { to: string; label: string }[] = [
  { to: "account-creation", label: "1. Account creation" },
  { to: "container-instantiation", label: "2. Request payment API access" },
  { to: "credentials", label: "3. Credential creation" },
  { to: "authentication", label: "4. Authentication" },
  { to: "collection", label: "5. Collection" },
  { to: "idempotency", label: "6. Idempotency" },
  { to: "payouts", label: "7. Payout requests" },
];

export function DocsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
    }`;

  return (
    <div className="min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-white">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 md:hidden dark:border-neutral-800">
        <span className="text-sm font-semibold tracking-tight">
          Payment Gateway Docs
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="text-neutral-600 dark:text-neutral-400"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-none overflow-y-auto border-r border-neutral-200 p-4 md:block dark:border-neutral-800">
          <p className="px-3 text-sm font-semibold tracking-tight">
            Payment Gateway Docs
          </p>
          <nav className="mt-4 flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <NavLink key={s.to} to={s.to} className={navLinkClass}>
                {s.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 dark:bg-neutral-950">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold tracking-tight">
                  Payment Gateway Docs
                </p>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="text-neutral-500"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="mt-4 flex flex-col gap-0.5">
                {SECTIONS.map((s) => (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass}
                  >
                    {s.label}
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 px-6 py-8 md:px-10">
          <div className="mx-auto max-w-2xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
