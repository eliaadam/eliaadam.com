import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

/*
 * Admin → Instantiation Grants. Per-actor overrides ONLY.
 *
 * The RULES (requires-subscription, caps, pre-conditions) now live inline on the
 * Container Kinds and Hierarchy Templates pages — configured where you author the
 * thing they govern. What remains here is the cross-cutting concern that doesn't
 * belong on any one kind/template: explicitly enabling or blocking a SPECIFIC
 * ACTOR for a kind or template, overriding the default rule.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

export function InstantiationGrantsPage() {
  const [f, setF] = useState({ actor_id: "", container_kind_id: "", enabled: true, max_override: "", note: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => api("POST", "hierarchy/admin/instantiation-grants", {
      actor_id: f.actor_id.trim(),
      container_kind_id: f.container_kind_id.trim(),
      enabled: f.enabled,
      max_override: f.max_override ? parseInt(f.max_override, 10) : undefined,
      note: f.note.trim() || undefined,
    }),
    onSuccess: () => setMsg("Grant saved."),
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">Instantiation Grants</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Enable or block a specific actor for a kind or template, overriding its default rule. The rules themselves live on the Container Kinds and Hierarchy Templates pages.
      </p>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Actor id</label>
            <input value={f.actor_id} onChange={(e) => set("actor_id", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Kind or template id</label>
            <input value={f.container_kind_id} onChange={(e) => set("container_kind_id", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Enabled (unchecked = blocked)
          </label>
          <input value={f.max_override} onChange={(e) => set("max_override", e.target.value)} inputMode="numeric" placeholder="Max override"
            className="w-32 px-3 py-1.5 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
        </div>

        <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Note (optional)"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-3" />

        <button onClick={() => save.mutate()} disabled={save.isPending || !f.actor_id.trim() || !f.container_kind_id.trim()}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
          {save.isPending ? "Saving…" : "Save grant"}
        </button>
        {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
      </div>
    </div>
  );
}
