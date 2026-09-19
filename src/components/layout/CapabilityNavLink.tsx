import { NavLink } from "react-router-dom";
import { usePermission } from "../../lib/hooks/usePermission";
import type { CapabilityManifest } from "../../lib/sdk";

export function CapabilityNavLink({
  manifest,
}: {
  manifest: CapabilityManifest;
}) {
  const nav = manifest.navigation;
  const { data: allowed, isPending } = usePermission(
    nav?.required_permission ?? null,
  );

  if (!nav || isPending || !allowed) return null;

  return (
    <NavLink
      to={`/dashboard/${nav.route}`}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100",
        ].join(" ")
      }
    >
      <span className="w-4 text-center text-sm leading-none">{nav.icon}</span>
      {nav.label}
    </NavLink>
  );
}
