import { useMemo } from "react";
import type { Capability } from "./registry/types";

export function PermissionsPanel({
  cap,
  isCustom,
}: {
  cap: Capability;
  isCustom: boolean;
}) {
  const byResource = useMemo(() => {
    const g: Record<string, Capability["permissions"]> = {};
    for (const p of cap.permissions) (g[p.resource_code] ??= []).push(p);
    return Object.entries(g);
  }, [cap.permissions]);

  return (
    <div className="space-y-4">
      {isCustom && (
        <p className="text-[11px] text-blue-600 dark:text-blue-300 m-0">
          This is a custom capability — you can add resources and roles to it
          via the API. Manifest capabilities are read-only here.
        </p>
      )}
      {byResource.map(([resource, perms]) => (
        <div
          key={resource}
          className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        >
          <p className="text-xs font-semibold text-black dark:text-white m-0 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 font-mono break-all">
            {resource}
          </p>
          <div className="flex flex-wrap gap-1.5 p-3">
            {perms.map((p) => (
              <span
                key={p.id}
                title={p.code}
                className="text-[11px] px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
              >
                {p.action_code}
              </span>
            ))}
          </div>
        </div>
      ))}

      {cap.roles.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <p className="text-xs font-semibold text-black dark:text-white m-0 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
            Roles
          </p>
          {cap.roles.map((r, i) => (
            <div
              key={r.id}
              className={`px-4 py-3 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-black dark:text-white">
                  {r.display_name}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {r.code}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
                {r.permissions.length} permission
                {r.permissions.length === 1 ? "" : "s"}
                {r.permissions.length === 0 && (
                  <span className="text-amber-600">
                    {" "}
                    — grants nothing; check the manifest and re-sync
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
