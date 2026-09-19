// DashboardLayout.tsx
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
  LayoutGrid,
  Rows3,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "../context/Authcontext";
import { useContainer } from "../context/ContainerContext";
import { ThemeToggle } from "../context/ThemeContext";

import { ContainerSwitcher } from "./ContainerSwitcher";
import { CapabilityNavLink } from "./CapabilityNavLink";
import { sdk } from "../../lib/sdk";
import {
  NavDisplayProvider,
  useNavDisplay,
  type NavDisplayMode,
} from "../../context/NavDisplayContext";

const staticNavItems = [
  { to: "/dashboard", label: "Containers", icon: Folders, end: true },
  { to: "/dashboard/profile", label: "Profile", icon: User, end: false },
  { to: "/dashboard/templates", label: "Templates", icon: Boxes, end: false },
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

// Aside width per display mode — the whole point of the toggle is that
// the rail visibly grows/shrinks, GitHub-collapsed-sidebar style.
const ASIDE_WIDTH: Record<NavDisplayMode, string> = {
  icons: "72px",
  "icons-label": "280px",
  label: "220px",
};

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
/* Nav display toggle (icons / icons+labels / labels)                        */
/* -------------------------------------------------------------------------- */

const NAV_DISPLAY_OPTIONS: {
  mode: NavDisplayMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { mode: "icons", label: "Icons only", icon: LayoutGrid },
  { mode: "icons-label", label: "Icons & labels", icon: Rows3 },
  { mode: "label", label: "Labels only", icon: AlignLeft },
];

function NavDisplayToggle() {
  const { mode, setMode } = useNavDisplay();
  const showLabel = mode !== "icons";

  return (
    <div
      className={[
        "hidden items-center gap-1 rounded-lg bg-muted p-1 md:flex",
        showLabel ? "" : "flex-col",
      ].join(" ")}
    >
      {NAV_DISPLAY_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.mode === mode;

        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            className={[
              "flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Capability navigation                                                     */
/* -------------------------------------------------------------------------- */

function CapabilityNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: capabilityNav } = useCapabilityNav();
  const { mode } = useNavDisplay();

  if (!capabilityNav || capabilityNav.length === 0) {
    return null;
  }

  const sorted = capabilityNav
    .slice()
    .sort((a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0));

  const showSectionLabel = mode !== "icons";

  return (
    <div>
      <div
        className={[
          "mb-2 flex items-center gap-2 px-3",
          showSectionLabel ? "" : "justify-center",
        ].join(" ")}
      >
        <Sparkles size={13} className="text-brand-green-500 shrink-0" />

        {showSectionLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Capabilities
          </span>
        )}
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
/* Profile / account context menu — carries the static app navigation        */
/* -------------------------------------------------------------------------- */

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open account menu"
        aria-expanded={open}
        className={[
          "flex h-9 items-center gap-2 rounded-lg bg-muted px-2",
          "text-sm font-medium text-foreground transition-colors",
          "hover:bg-muted/70",
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

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-surface shadow-xl shadow-black/10 dark:shadow-black/30">
          {/* Account identity */}
          <div className="bg-muted/40 p-4">
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

          {/* Static application navigation */}
          <div className="p-2">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>

            <nav className="flex flex-col gap-1">
              {staticNavItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")
                  }
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Sign out */}
          <div className="p-2">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-error/5 hover:text-error"
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
/* Capability drawer / aside — width now reacts to nav display mode          */
/* -------------------------------------------------------------------------- */

function CapabilityDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { mode } = useNavDisplay();
  const width = ASIDE_WIDTH[mode];

  return (
    <>
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

      <aside
        style={{ width: open ? width : undefined }}
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "bg-background shadow-xl md:static md:z-auto md:shadow-none",
          "transition-[width,transform] duration-300 ease-out",
          open ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px]",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <img
            src="/images/mainlogo.png"
            alt="Sonic Pesa"
            className="h-8 w-auto object-contain"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">
          <div className="mb-5">
            <ContainerSwitcher />
          </div>

          <div className="mb-4">
            <NavDisplayToggle />
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

function DashboardLayoutContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode } = useNavDisplay();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="flex min-h-screen">
        <div className="md:hidden">
          <CapabilityDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </div>

        <div
          style={{ width: ASIDE_WIDTH[mode] }}
          className="hidden shrink-0 transition-[width] duration-300 ease-out md:flex"
        >
          <CapabilityDrawer open onClose={() => undefined} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground md:hidden"
              >
                <Menu size={18} />
              </button>

              {/* Brand — mobile only; desktop aside already carries the logo */}
              <div className="flex min-w-0 flex-1 items-center md:hidden">
                <img
                  src="/images/mainlogo.png"
                  alt="Sonic Pesa"
                  className="h-7 w-auto object-contain"
                />
              </div>

              <div className="hidden flex-1 md:block" />

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ProfileMenu />
              </div>
            </div>
          </header>

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

export function DashboardLayout() {
  return (
    <NavDisplayProvider>
      <DashboardLayoutContent />
    </NavDisplayProvider>
  );
}
