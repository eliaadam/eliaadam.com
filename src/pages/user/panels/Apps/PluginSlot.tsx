import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
 
import { appsApi as api } from "./apps-api";
import PluginHost from "../PluginHost";

/**
 * PluginSlot — renders every installed plugin that fills a given surface slot.
 *
 * For each plugin it:
 *   1. reads the container's plugins (from installed apps) for this slot
 *   2. obtains a SHORT-LIVED app SESSION TOKEN from the host endpoint (the user
 *      must have the app installed — the server enforces this)
 *   3. renders the plugin via PluginHost, passing the token (host-side only) and
 *      the effective (granted ∩ requested) scopes
 *
 * The token is fetched by the trusted host and handed to PluginHost, which keeps
 * it host-side and never exposes it to the sandboxed iframe.
 */
export default function PluginSlot({
  containerId,
  slot,
  apiBase,
}: {
  containerId: string;
  slot: string;
  apiBase?: string;
}) {
  const plugins = useQuery({
    queryKey: ["plugins", "container", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/plugins`),
  });

  const list: any[] = Array.isArray(plugins.data) ? plugins.data : [];
  const forSlot = list.filter((p) =>
    (p.surfaces ?? []).some((s: any) => s.slot === slot),
  );

  if (plugins.isLoading) {
    return <div className="p-4 text-sm text-neutral-500">Loading plugins…</div>;
  }
  if (forSlot.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        No plugins here yet. Installed apps that ship a plugin for this area will appear here.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {forSlot.map((p) => (
        <PluginFrame key={p.plugin_id} containerId={containerId} plugin={p} apiBase={apiBase} />
      ))}
    </div>
  );
}

/** Obtains the session token for one plugin's app, then mounts PluginHost. */
function PluginFrame({ containerId, plugin, apiBase }: { containerId: string; plugin: any; apiBase?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api("POST", `/containers/${containerId}/apps/${plugin.app_id}/session-token`);
        if (!cancelled) setToken(res?.token ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Could not start plugin.");
      }
    })();
    return () => { cancelled = true; };
  }, [containerId, plugin.app_id]);

  const title = (plugin.surfaces?.[0]?.title) ?? plugin.name;

  return (
    <div>
      <div className="text-sm font-medium text-black dark:text-white mb-2 flex items-center gap-2">
        {title}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">plugin</span>
      </div>
      {error ? (
        <div className="text-xs text-red-600 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">{error}</div>
      ) : !token ? (
        <div className="text-xs text-neutral-400">Starting…</div>
      ) : (
        <PluginHost
          manifest={{
            id: plugin.plugin_id,
            name: plugin.name,
            app_slug: plugin.app_id,
            entry: plugin.entry_url,
            requested_scopes: plugin.requested_scopes ?? [],
          }}
          containerId={containerId}
          grantedScopes={plugin.granted_scopes ?? []}
          appToken={token}
          apiBase={apiBase}
        />
      )}
    </div>
  );
}
