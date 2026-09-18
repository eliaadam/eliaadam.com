import { useEffect, useRef, useState } from "react";
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
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../context/Authcontext";
import { useContainer } from "../context/ContainerContext";
import { ThemeToggle } from "../context/ThemeContext";
import { ContainerSwitcher } from "./ContainerSwitcher";
import { CapabilityNavLink } from "./CapabilityNavLink";
import { sdk } from "../../lib/sdk";

const staticNavItems = [
  {
    to: "/dashboard",
    label: "Containers",
    icon: Folders,
    end: true,
  },
  {
    to: "/dashboard/profile",
    label: "Profile",
    icon: User,
    end: false,
  },
  {
    to: "/dashboard/templates",
    label: "Templates",
    icon: Boxes,
    end: false,
  },
  {
    to: "/dashboard/invitations",
    label: "Invitations",
    icon: Mail,
    end: false,
  },
  {
    to: "/dashboard/my-instantiation-requests",
    label: "My requests",
    icon: ClipboardList,
    end: false,
  },
  {
    to: "/dashboard/my-subscriptions",
    label: "My subscriptions",
    icon: Star,
    end: false,
  },
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
      manifests.filter(
        (manifest) => manifest.licensed && manifest.navigation !== null,
      ),
  });
}

/* -------------------------------------------------------------------------- */
/* Static application navigation                                              */
/* -------------------------------------------------------------------------- */

function StaticNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {staticNavItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              "text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            ].join(" ")
          }
        >
          <Icon size={16} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Capability navigation                                                      */
/* -------------------------------------------------------------------------- */

function CapabilityNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: capabilityNav } = useCapabilityNav();

  if (!capabilityNav || capabilityNav.length === 0) {
    return null;
  }

  const sorted = capabilityNav
    .slice()
    .sort((a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0));

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-3">
        <Sparkles size={13} className="text-brand-green-500" />

        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Capabilities
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {sorted.map((manifest) => (
          <div key={manifest.feature_code} onClick={onNavigate}>
            <CapabilityNavLink manifest={manifest} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile / application menu                                                 */
/* -------------------------------------------------------------------------- */

function ProfileMenu() {
  const { user, signOut } = useAuth();

  const [open, setOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  /*
   * Close when clicking outside the menu.
   */
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  /*
   * Close with Escape.
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Profile trigger */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open account menu"
        aria-expanded={open}
        className={[
          "flex h-9 items-center gap-2 rounded-lg",
          "border border-border bg-surface px-2",
          "text-sm font-medium text-foreground",
          "transition-colors",
          "hover:border-brand-blue-500/40",
          "focus:outline-none focus:ring-4 focus:ring-brand-blue-500/10",
        ].join(" ")}
      >
        <span className="grid size-7 place-items-center rounded-md bg-brand-gradient text-xs font-semibold text-white">
          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
        </span>

        <ChevronDown
          size={14}
          className={[
            "hidden transition-transform sm:block",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* Context menu */}
      {open && (
        <div
          className={[
            "absolute right-0 top-12 z-50",
            "w-[280px] max-w-[calc(100vw-2rem)]",
            "overflow-hidden rounded-2xl",
            "border border-border bg-surface",
            "shadow-xl shadow-black/10",
            "dark:shadow-black/30",
          ].join(" ")}
        >
          {/* Account identity */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-sm font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.name}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Application navigation */}
          <div className="p-2">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>

            <StaticNav onNavigate={() => setOpen(false)} />
          </div>

          {/* Sign out */}
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={signOut}
              className={[
                "flex w-full items-center gap-3 rounded-lg",
                "px-3 py-2.5 text-sm font-medium",
                "text-muted-foreground",
                "transition-colors",
                "hover:bg-error/5 hover:text-error",
              ].join(" ")}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Capability drawer                                                          */
/* -------------------------------------------------------------------------- */

function CapabilityDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden",
          "transition-opacity duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col",
          "border-r border-border bg-surface",
          "shadow-xl md:static md:z-auto md:shadow-none",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <img
            src="/images/mainlogo.png"
            alt="Sonic Pesa"
            className="h-8 w-auto object-contain"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close capabilities"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mb-5">
            <ContainerSwitcher />
          </div>

          <CapabilityNav onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard layout                                                           */
/* -------------------------------------------------------------------------- */

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="flex min-h-screen">
        {/* ------------------------------------------------------------------ */}
        {/* Capability drawer                                                  */}
        {/* ------------------------------------------------------------------ */}

        <div className="md:hidden">
          <CapabilityDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </div>

        <div className="hidden md:flex md:w-[280px] md:flex-none">
          <CapabilityDrawer open onClose={() => undefined} />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Main application                                                   */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* Mobile capability menu */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open capabilities"
                className={[
                  "grid size-9 shrink-0 place-items-center",
                  "rounded-lg border border-border bg-surface",
                  "text-muted-foreground",
                  "transition-colors",
                  "hover:text-foreground md:hidden",
                ].join(" ")}
              >
                <Menu size={18} />
              </button>

              {/* Brand */}
              <div className="flex min-w-0 flex-1 items-center">
                <img
                  src="/images/mainlogo.png"
                  alt="Sonic Pesa"
                  className="h-7 w-auto object-contain md:h-8"
                />
              </div>

              {/* Desktop spacing / utility area */}
              <div className="flex items-center gap-2">
                <ThemeToggle />

                {/* Profile menu exists on ALL screen sizes */}
                <ProfileMenu />
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
