import { Link } from "react-router-dom";
import {
  KeyRound,
  Folders,
  UserCog,
  BarChart3,
  CheckSquare,
  Settings,
} from "lucide-react";

/**
 * The landing page `core.admin`'s `navigation()` points at. Closes a
 * gap that existed even before this capability's per-container
 * redesign: `/dashboard/admin` was never a registered route at all,
 * only its four children (`/admin/actors`, `/admin/containers`,
 * `/admin/all-containers`, `/admin/license-container`) — there was
 * nowhere for a top-level "Admin" nav entry to actually go. This page
 * is that real destination.
 *
 * No permission check of its own — reaching this page at all already
 * required `core.admin.actor.view` (the nav link itself is gated).
 * The four sub-pages each have their own real enforcement server-side
 * regardless of how someone navigates to them.
 */
const ADMIN_SECTIONS = [
  {
    to: "/dashboard/admin/actors",
    label: "Actors",
    icon: UserCog,
    description: "Suspend, activate, or archive any actor on the platform.",
  },
  {
    to: "/dashboard/admin/containers",
    label: "Container hierarchy",
    icon: Folders,
    description: "Browse the full container tree.",
  },
  {
    to: "/dashboard/admin/all-containers",
    label: "All containers",
    icon: Folders,
    description: "Every container, across every hierarchy.",
  },
  {
    to: "/dashboard/admin/license-container",
    label: "License a container",
    icon: KeyRound,
    description: "Grant or revoke a capability on any container.",
  },
  {
    to: "/dashboard/payment-reporting",
    label: "Payment reporting",
    icon: BarChart3,
    description: "Every wallet and transaction, across every container.",
  },
  {
    to: "/dashboard/admin/payment-gateway-approvals",
    label: "Payment gateway approvals",
    icon: CheckSquare,
    description: "Pending API key requests awaiting approval.",
  },
  {
    to: "/dashboard/admin/payment-gateway-settings",
    label: "Payment gateway settings",
    icon: Settings,
    description: "Platform-wide gateway routing and payout fee rules.",
  },
];

export function AdminHub() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Platform-wide administration, checked against whichever container you're
        currently in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADMIN_SECTIONS.map(({ to, label, icon: Icon, description }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <Icon size={18} className="text-neutral-400" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
