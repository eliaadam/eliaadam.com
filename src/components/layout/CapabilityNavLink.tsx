import { NavLink } from "react-router-dom";
import { usePermission } from "../../lib/hooks/usePermission";
import type { CapabilityManifest } from "../../lib/sdk";

/**
 * One capability's nav entry, gated on its `required_permission`.
 *
 * Pulled into its own component (rather than a permission check inside
 * a `.map()` in DashboardLayout) specifically so `usePermission`'s hook
 * call has a stable, one-per-component-instance call site — a variable
 * number of capabilities is fine across separate component instances,
 * it would NOT be fine to call a variable number of hooks inside one
 * component's own render (Rules of Hooks).
 *
 * Renders nothing while the check is pending, same "don't flash a
 * flicker of a control the person can't use" instinct as
 * `ProtectedRoute` waiting out `isLoading` before deciding.
 */
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
