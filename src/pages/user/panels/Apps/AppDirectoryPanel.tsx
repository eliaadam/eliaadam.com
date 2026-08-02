import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appsApi as api } from "./apps-api";

type App = { id: string; slug: string; name: string; description: string | null };
type ConsentScope = { scope: string; display_name: string; description: string | null; required: boolean; grantable: boolean; missing: string[] };

/** Public app directory + the consent/install flow. */
export default function AppDirectoryPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<App | null>(null);

  const directory = useQuery({
    queryKey: ["apps", "directory"],
    queryFn: () => api("GET", `/directory`),
  });

  const list: App[] = Array.isArray(directory.data) ? directory.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {directory.isLoading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-neutral-500">No public apps yet.</div>
        ) : (
          list.map((a) => (
            <div key={a.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col">
              <div className="text-sm font-medium text-black dark:text-white">{a.name}</div>
              {a.description && <div className="text-[11px] text-neutral-400 mt-1 flex-1">{a.description}</div>}
              <button onClick={() => setConsentFor(a)} className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black self-start">
                Install
              </button>
            </div>
          ))
        )}
      </div>

      {consentFor && (
        <ConsentModal
          app={consentFor}
          containerId={containerId}
          onClose={() => setConsentFor(null)}
          onInstalled={() => { setMsg(`${consentFor.name} installed.`); setConsentFor(null); qc.invalidateQueries({ queryKey: ["apps", "installed", containerId] }); }}
        />
      )}
    </div>
  );
}

/** Consent screen — shows requested scopes, whether you can grant each (the clamp). */
function ConsentModal({ app, containerId, onClose, onInstalled }: { app: App; containerId: string; onClose: () => void; onInstalled: () => void }) {
  const preview = useQuery({
    queryKey: ["apps", "consent", containerId, app.id],
    queryFn: () => api("GET", `/containers/${containerId}/apps/${app.id}/consent`),
  });
  const scopes: ConsentScope[] = Array.isArray(preview.data) ? preview.data : [];
  const grantable = scopes.filter((s) => s.grantable).map((s) => s.scope);
  const blocked = scopes.filter((s) => !s.grantable);

  const install = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/apps/${app.id}/install`, { consented_scopes: grantable }),
    onSuccess: onInstalled,
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 max-w-md w-full">
        <h3 className="text-base font-semibold text-black dark:text-white m-0 mb-1">Install {app.name}</h3>
        <p className="text-xs text-neutral-500 mb-4">This app is requesting the following access in this container:</p>

        {preview.isLoading ? (
          <p className="text-sm text-neutral-500">Checking permissions…</p>
        ) : (
          <div className="space-y-2 mb-4">
            {scopes.map((s) => (
              <div key={s.scope} className={`px-3 py-2 rounded-md border ${s.grantable ? "border-neutral-200 dark:border-neutral-800" : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"}`}>
                <div className="text-sm text-black dark:text-white flex items-center justify-between">
                  {s.display_name}
                  {s.grantable
                    ? <span className="text-[10px] text-green-600">you can grant</span>
                    : <span className="text-[10px] text-amber-600">you lack this</span>}
                </div>
                {s.description && <div className="text-[11px] text-neutral-400 mt-0.5">{s.description}</div>}
                {!s.grantable && s.missing.length > 0 && (
                  <div className="text-[10px] text-amber-600 mt-1">missing: {s.missing.join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {blocked.length > 0 && (
          <p className="text-[11px] text-amber-600 mb-3">
            Scopes you don't hold won't be granted — the app is installed with only what you can give it.
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">Cancel</button>
          <button
            onClick={() => install.mutate()}
            disabled={install.isPending || grantable.length === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {install.isPending ? "Installing…" : `Grant & install (${grantable.length})`}
          </button>
        </div>
        {install.isError && <p className="text-xs text-red-600 mt-2">{(install.error as any)?.message}</p>}
      </div>
    </div>
  );
}
