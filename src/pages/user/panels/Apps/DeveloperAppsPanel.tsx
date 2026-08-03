import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appsApi as api } from "./apps-api";
import PluginManagerSection from "./PluginManagerSection";

type App = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  is_public: boolean;
};
type Scope = { code: string; display_name: string; description: string | null };

/** Developer side — register + manage apps this container owns. */
export default function DeveloperAppsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const canRegister = can("maicore.apps.app.register");

  const apps = useQuery({
    queryKey: ["apps", "mine", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/apps`),
  });
  // Scopes are needed both for the register form AND for the plugin manager
  // (a plugin's scopes must be a subset of the platform scopes), so fetch always.
  const scopes = useQuery({
    queryKey: ["apps", "scopes"],
    queryFn: () => api("GET", `/scopes`),
  });

  const publish = useMutation({
    mutationFn: (appId: string) =>
      api("POST", `/containers/${containerId}/apps/${appId}/publish`),
    onSuccess: () => {
      setMsg("App published.");
      qc.invalidateQueries({ queryKey: ["apps", "mine", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const rotate = useMutation({
    mutationFn: (appId: string) =>
      api("POST", `/containers/${containerId}/apps/${appId}/rotate-key`),
    onSuccess: (data: any) => {
      setNewKey(data?.api_key ?? null);
      setMsg("Key rotated — copy it now, it won't be shown again.");
    },
    onError: (e: any) => setMsg(e.message),
  });

  const list: App[] = Array.isArray(apps.data) ? apps.data : [];
  const scopeList: Scope[] = Array.isArray(scopes.data) ? scopes.data : [];
  const scopeCodes = scopeList.map((s) => s.code);

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {newKey && (
        <div className="text-xs px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800">
          <div className="font-medium text-amber-800 dark:text-amber-300 mb-1">
            API key (shown once):
          </div>
          <code className="break-all text-amber-900 dark:text-amber-200">
            {newKey}
          </code>
          <button
            onClick={() => setNewKey(null)}
            className="ml-2 text-amber-600"
          >
            dismiss
          </button>
        </div>
      )}

      {canRegister && (
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          {creating ? "Close" : "+ Register app"}
        </button>
      )}

      {creating && canRegister && (
        <RegisterForm
          containerId={containerId}
          scopes={scopeList}
          onCreated={(key) => {
            setNewKey(key);
            setMsg("App registered — copy the API key now.");
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["apps", "mine", containerId] });
          }}
        />
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {apps.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">No apps yet.</div>
        ) : (
          list.map((a) => (
            <div key={a.id} className="px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    {a.name}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {a.status}
                    </span>
                    {a.is_public && (
                      <span className="text-[10px] text-green-600">public</span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {a.slug}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                  >
                    {expanded === a.id ? "Hide plugins" : "Plugins"}
                  </button>
                  {a.status === "draft" && (
                    <button
                      onClick={() => publish.mutate(a.id)}
                      className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => rotate.mutate(a.id)}
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                  >
                    Rotate key
                  </button>
                </div>
              </div>

              {expanded === a.id && (
                <PluginManagerSection
                  containerId={containerId}
                  appId={a.id}
                  appScopes={scopeCodes}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RegisterForm({
  containerId,
  scopes,
  onCreated,
}: {
  containerId: string;
  scopes: Scope[];
  onCreated: (apiKey: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (code: string) =>
    setSelected(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );

  const save = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/apps`, {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        requested_scopes: selected,
      }),
    onSuccess: (data: any) => onCreated(data?.api_key ?? ""),
  });

  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="App name"
        className={`${input} w-full`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={`${input} w-full`}
        rows={2}
      />
      <div>
        <label className="block text-[11px] font-medium text-neutral-500 mb-1">
          Requested scopes
        </label>
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => toggle(s.code)}
              className={`text-[11px] px-2 py-1 rounded-full border ${selected.includes(s.code) ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
              title={s.description ?? ""}
            >
              {selected.includes(s.code) ? "✓ " : ""}
              {s.display_name}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        List publicly (other containers can install)
      </label>
      <button
        onClick={() => save.mutate()}
        disabled={!name.trim() || save.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        Register app
      </button>
      {save.isError && (
        <span className="ml-2 text-xs text-red-600">
          {(save.error as any)?.message}
        </span>
      )}
    </div>
  );
}
