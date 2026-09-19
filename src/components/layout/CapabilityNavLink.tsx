// CapabilityNavLink.tsx
import { NavLink } from "react-router-dom";
import { usePermission } from "../../lib/hooks/usePermission";
import { useNavDisplay } from "../../context/NavDisplayContext";
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
  const { mode } = useNavDisplay();

  if (!nav || isPending || !allowed) return null;

  const showIcon = mode !== "label";
  const showLabel = mode !== "icons";

  return (
    <NavLink
      to={`/dashboard/${nav.route}`}
      title={nav.label}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          showLabel ? "" : "justify-center",
          isActive
            ? "bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ")
      }
    >
      {showIcon && (
        <span className="w-4 shrink-0 text-center text-sm leading-none">
          {nav.icon}
        </span>
      )}

      {showLabel && <span className="truncate">{nav.label}</span>}
    </NavLink>
  );
}
