import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appsApi as api } from "./apps-api";

/**
 * PluginManagerSection — developer UI to attach a plugin to an app and upload its
 * bundle. Drop this into DeveloperAppsPanel under each app row (or a detail view).
 *
 * Flow: register plugin (name + scopes + surface) → upload .zip bundle → active.
 * Once active and the app is installed in a container, the plugin renders there.
 */
export default function PluginManagerSection({
  containerId,
  appId,
  appScopes,
}: {
  containerId: string;
  appId: string;
  appScopes: string[];
}) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const plugins = useQuery({
    queryKey: ["plugins", "app", appId],
    queryFn: () =>
      api("GET", `/containers/${containerId}/apps/${appId}/plugins`),
  });

  const register = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/apps/${appId}/plugins`, {
        name: name.trim(),
        requested_scopes: selected,
        surfaces: [{ slot: "container.tab", title: name.trim() }],
      }),
    onSuccess: () => {
      setMsg("Plugin registered — now upload its bundle.");
      setName("");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["plugins", "app", appId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const list: any[] = Array.isArray(plugins.data) ? plugins.data : [];
  const toggle = (s: string) =>
    setSelected(
      selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s],
    );
  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="mt-3 pl-3 border-l-2 border-neutral-100 dark:border-neutral-900 space-y-3">
      <div className="text-[11px] font-medium text-neutral-500">
        Frontend plugins
      </div>
      {msg && (
        <div className="text-[11px] px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
          {msg}
        </div>
      )}

      {list.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <div>
            <span className="text-black dark:text-white">{p.name}</span>
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${p.status === "active" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
            >
              {p.status}
            </span>
          </div>
          <BundleUpload
            containerId={containerId}
            appId={appId}
            pluginId={p.id}
            onDone={() => {
              setMsg("Bundle uploaded — plugin active.");
              qc.invalidateQueries({ queryKey: ["plugins", "app", appId] });
            }}
            onError={setMsg}
          />
        </div>
      ))}

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Plugin name"
          className={`${input} w-full`}
        />
        <div className="flex flex-wrap gap-1">
          {appScopes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${selected.includes(s) ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
            >
              {selected.includes(s) ? "✓ " : ""}
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => register.mutate()}
          disabled={!name.trim() || register.isPending}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          Add plugin
        </button>
      </div>
    </div>
  );
}

function BundleUpload({
  containerId,
  appId,
  pluginId,
  onDone,
  onError,
}: {
  containerId: string;
  appId: string;
  pluginId: string;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("bundle", file);
      const token = localStorage.getItem("sindano_token");
      const res = await fetch(
        `${API}/api/apps/containers/${containerId}/apps/${appId}/plugins/${pluginId}/bundle`,
        {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: fd,
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
      onDone();
    } catch (err: any) {
      onError(err.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="text-[10px] px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer text-neutral-600 dark:text-neutral-400">
      {busy ? "Uploading…" : "Upload .zip"}
      <input
        type="file"
        accept=".zip"
        onChange={onFile}
        className="hidden"
        disabled={busy}
      />
    </label>
  );
}
