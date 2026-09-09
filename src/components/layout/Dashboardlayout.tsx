import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Folders,
  User,
  Boxes,
  Mail,
  ClipboardList,
  Star,
  ShoppingBag,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/Authcontext";
import { useContainer } from "../context/ContainerContext";
import { ThemeToggle } from "../context/ThemeContext";
import { ContainerSwitcher } from "./ContainerSwitcher";
import { CapabilityNavLink } from "./CapabilityNavLink";
import { sdk } from "../../lib/sdk";

const staticNavItems = [
  // "Containers" (Discover + My Containers tabs) is now the index
  // route — replaces the old Registry-asset "Recent" feed (dropped)
  // and the standalone "Join" page (folded into the Discover tab).
  { to: "/dashboard", label: "Containers", icon: Folders, end: true },
  { to: "/dashboard/profile", label: "Profile", icon: User, end: false },
  // Ungated on purpose — instantiating a template and
  // creating/redeeming invitations are both open to any authenticated
  // actor on the backend (see each page's own docstring for exactly
  // why), so they're not hidden behind usePermission the way
  // admin-only pages are.
  { to: "/dashboard/templates", label: "Templates", icon: Boxes, end: false },
  {
    to: "/dashboard/invitations",
    label: "Invitations",
    icon: Mail,
    end: false,
  },
  // Also ungated — any authenticated actor can submit an
  // instantiation request (that's what "requires approval" MEANS: no
  // special permission to submit, only to decide), so checking on
  // your own requests' status shouldn't need one either.
  {
    to: "/dashboard/my-instantiation-requests",
    label: "My requests",
    icon: ClipboardList,
    end: false,
  },
  // Same reasoning — subscribing is open to any authenticated actor,
  // no special permission required (see interface/views.py's own
  // module docstring in capabilities.core.subscription), so checking
  // your own subscriptions' status shouldn't need one either.
  {
    to: "/dashboard/my-subscriptions",
    label: "My subscriptions",
    icon: Star,
    end: false,
  },
  // Same reasoning again — buying is open to any authenticated actor,
  // no permission required (see capabilities.core.surfacing's own
  // interface/views.py module docstring), so checking your own
  // purchase history shouldn't need one either.
  {
    to: "/dashboard/my-purchases",
    label: "My purchases",
    icon: ShoppingBag,
    end: false,
  },
];

function useCapabilityNav() {
  const { currentContainerId } = useContainer();

  return useQuery({
    queryKey: ["capability", "manifests", currentContainerId],
    queryFn: () =>
      sdk.capability.listManifests(currentContainerId ?? undefined),
    enabled: Boolean(currentContainerId),
    select: (manifests) =>
      manifests.filter((m) => m.licensed && m.navigation !== null),
  });
}

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { data: capabilityNav } = useCapabilityNav();

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col justify-between border-b border-neutral-200 p-6 dark:border-neutral-800 md:border-b-0 md:border-r">
        <div>
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">Sysc</span>
            <ThemeToggle />
          </div>

          <div className="mb-6">
            <ContainerSwitcher />
          </div>

          <nav className="flex flex-col gap-1">
            {staticNavItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100",
                  ].join(" ")
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}

            {capabilityNav && capabilityNav.length > 0 && (
              <>
                <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
                {capabilityNav
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.navigation!.order ?? 0) - (b.navigation!.order ?? 0),
                  )
                  .map((manifest) => (
                    <CapabilityNavLink
                      key={manifest.feature_code}
                      manifest={manifest}
                    />
                  ))}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
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
