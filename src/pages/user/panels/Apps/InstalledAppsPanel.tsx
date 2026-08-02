import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appsApi as api } from "./apps-api";

type Installation = {
  id: string;
  app_id: string;
  granted_scopes: string[] | string;
  installed_at: string | null;
  status: string;
};

/** Apps installed in this container, with uninstall. */
export default function InstalledAppsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const canManage = can("maicore.apps.installation.install");

  const installed = useQuery({
    queryKey: ["apps", "installed", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/installed`),
  });

  const uninstall = useMutation({
    mutationFn: (appId: string) => api("DELETE", `/containers/${containerId}/apps/${appId}/install`),
    onSuccess: () => { setMsg("App uninstalled."); qc.invalidateQueries({ queryKey: ["apps", "installed", containerId] }); },
    onError: (e: any) => setMsg(e.message),
  });

  const list: Installation[] = Array.isArray(installed.data) ? installed.data : [];
  const scopesOf = (i: Installation) => (Array.isArray(i.granted_scopes) ? i.granted_scopes : (() => { try { return JSON.parse(i.granted_scopes as string); } catch { return []; } })());

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {installed.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">No apps installed. Browse the Directory to add one.</div>
        ) : (
          list.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  App {i.app_id.slice(0, 8)}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">{i.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {scopesOf(i).map((s: string) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{s}</span>
                  ))}
                </div>
              </div>
              {canManage && (
                <button onClick={() => uninstall.mutate(i.app_id)} className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400">
                  Uninstall
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
