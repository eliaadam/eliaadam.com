import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

/*
 * Admin → Instantiation Rules. Configure, per container kind, who may
 * instantiate it: enabled by default? requires a subscription? per-actor cap?
 * pre-conditions? Plus per-actor grants to enable/disable specific actors.
 *
 * The admin enters a container_kind_id (from the Container Kinds admin area) and
 * sets its rule. Grants are set by actor + kind id.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

export function InstantiationRulesPage() {
  const vocabQ = useQuery({
    queryKey: ["sub-vocab"],
    queryFn: () => api("GET", "subscriptions/admin/vocabulary"),
  });
  const plansQ = useQuery({
    queryKey: ["sub-plans"],
    queryFn: () => api("GET", "subscriptions/admin/plans"),
  });
  const vocab = vocabQ.data ?? {
    entitlement_types: [],
    precondition_kinds: [],
  };
  const plans = Array.isArray(plansQ.data) ? plansQ.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">
        Instantiation Rules
      </h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Control who can create containers of each kind — whether it needs a
        subscription, per-actor limits, and required steps.
      </p>

      <RuleEditor vocab={vocab} plans={plans} />
      <GrantEditor />
    </div>
  );
}

function RuleEditor({ vocab, plans }: { vocab: any; plans: any[] }) {
  const [kindId, setKindId] = useState("");
  const [f, setF] = useState({
    enabled_by_default: true,
    requires_subscription: false,
    required_entitlement_type: "hierarchy.instantiate",
    required_plan_id: "",
    max_per_actor: "",
  });
  const [preconditions, setPreconditions] = useState<{ kind: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api("PUT", `hierarchy/admin/instantiation-rules/${kindId.trim()}`, {
        enabled_by_default: f.enabled_by_default,
        requires_subscription: f.requires_subscription,
        required_entitlement_type: f.requires_subscription
          ? f.required_entitlement_type
          : undefined,
        required_plan_id:
          f.requires_subscription && f.required_plan_id
            ? f.required_plan_id
            : undefined,
        max_per_actor: f.max_per_actor
          ? parseInt(f.max_per_actor, 10)
          : undefined,
        preconditions: preconditions.length
          ? preconditions.map((p) => ({ kind: p.kind, config: {} }))
          : undefined,
      }),
    onSuccess: () => setMsg("Rule saved."),
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Kind rule
      </p>

      <div className="mb-3">
        <label className="text-[11px] text-neutral-400 block mb-0.5">
          Container kind id
        </label>
        <input
          value={kindId}
          onChange={(e) => setKindId(e.target.value)}
          placeholder="container_kind_id (uuid)"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
      </div>

      <div className="space-y-2 mb-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={f.enabled_by_default}
            onChange={(e) => set("enabled_by_default", e.target.checked)}
          />
          Enabled by default (actors may instantiate unless individually
          blocked)
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={f.requires_subscription}
            onChange={(e) => set("requires_subscription", e.target.checked)}
          />
          Requires an active subscription
        </label>
      </div>

      {f.requires_subscription && (
        <div className="grid grid-cols-2 gap-3 mb-3 pl-6">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Entitlement type
            </label>
            <select
              value={f.required_entitlement_type}
              onChange={(e) => set("required_entitlement_type", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              {(vocab.entitlement_types ?? []).map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">
              Specific plan (optional)
            </label>
            <select
              value={f.required_plan_id}
              onChange={(e) => set("required_plan_id", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              <option value="">Any qualifying plan</option>
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="text-[11px] text-neutral-400 block mb-0.5">
          Max per actor (blank = no limit)
        </label>
        <input
          value={f.max_per_actor}
          onChange={(e) => set("max_per_actor", e.target.value)}
          inputMode="numeric"
          className="w-40 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-neutral-400 block mb-1">
          Pre-conditions before instantiation
        </label>
        {preconditions.map((pc, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <select
              value={pc.kind}
              onChange={(e) =>
                setPreconditions((prev) =>
                  prev.map((x, xi) =>
                    xi === i ? { kind: e.target.value } : x,
                  ),
                )
              }
              className="px-2 py-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              {(vocab.precondition_kinds ?? []).map((k: string) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                setPreconditions((prev) => prev.filter((_, xi) => xi !== i))
              }
              className="text-[11px] text-red-500"
            >
              remove
            </button>
          </div>
        ))}
        {(vocab.precondition_kinds ?? []).length > 0 && (
          <button
            onClick={() =>
              setPreconditions((prev) => [
                ...prev,
                { kind: vocab.precondition_kinds[0] },
              ])
            }
            className="text-[11px] text-neutral-500 underline"
          >
            + add pre-condition
          </button>
        )}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !kindId.trim()}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : "Save rule"}
      </button>
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function GrantEditor() {
  const [f, setF] = useState({
    actor_id: "",
    container_kind_id: "",
    enabled: true,
    max_override: "",
    note: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api("POST", "hierarchy/admin/instantiation-grants", {
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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Per-actor grant
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Explicitly enable or block a specific actor for a kind, overriding the
        default rule.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-neutral-400 block mb-0.5">
            Actor id
          </label>
          <input
            value={f.actor_id}
            onChange={(e) => set("actor_id", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-400 block mb-0.5">
            Container kind id
          </label>
          <input
            value={f.container_kind_id}
            onChange={(e) => set("container_kind_id", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={f.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Enabled (unchecked = blocked)
        </label>
        <div>
          <input
            value={f.max_override}
            onChange={(e) => set("max_override", e.target.value)}
            inputMode="numeric"
            placeholder="Max override"
            className="w-32 px-3 py-1.5 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
        </div>
      </div>

      <input
        value={f.note}
        onChange={(e) => set("note", e.target.value)}
        placeholder="Note (optional)"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-3"
      />

      <button
        onClick={() => save.mutate()}
        disabled={
          save.isPending || !f.actor_id.trim() || !f.container_kind_id.trim()
        }
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : "Save grant"}
      </button>
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}
