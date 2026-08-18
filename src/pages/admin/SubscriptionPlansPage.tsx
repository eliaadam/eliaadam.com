import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Admin → Subscription Plans. The control surface for the subscription
 * framework. The form ADAPTS to the chosen billing model and entitlement type —
 * a quota plan asks for quota, a duration plan asks for days, an instantiation
 * entitlement asks for template — because those are the framework's axes.
 *
 * Pickers are populated from the live vocabulary endpoint (what's actually
 * registered), not hardcoded, so new billing models / entitlement types appear
 * automatically.
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

type Vocabulary = {
  billing_models: string[];
  entitlement_types: string[];
  precondition_kinds: string[];
};

type Plan = {
  id: string;
  code: string;
  name: string;
  billing_model: string;
  entitlement_type: string;
  price: number;
  currency: string;
  duration_days?: number;
  quota?: number;
  is_active: boolean;
};

export function SubscriptionPlansPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const vocabQ = useQuery({
    queryKey: ["sub-vocab"],
    queryFn: () => api("GET", "subscriptions/admin/vocabulary"),
  });
  const plansQ = useQuery({
    queryKey: ["sub-plans"],
    queryFn: () => api("GET", "subscriptions/admin/plans"),
  });

  const vocab: Vocabulary = vocabQ.data ?? {
    billing_models: [],
    entitlement_types: [],
    precondition_kinds: [],
  };
  const plans: Plan[] = Array.isArray(plansQ.data) ? plansQ.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-black dark:text-white m-0">
          Subscription Plans
        </h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + New plan
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Plans combine a billing model (how it's paid & lives) with an
        entitlement (what it grants). Add pre-conditions to gate purchase.
      </p>

      {creating && (
        <PlanForm
          vocab={vocab}
          onDone={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["sub-plans"] });
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {plansQ.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : plans.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">
            No plans yet. Create one to enable subscriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-black dark:text-white m-0">
                  {p.name}{" "}
                  <span className="text-[11px] font-normal text-neutral-400">
                    ({p.code})
                  </span>
                </p>
                <p className="text-[11px] text-neutral-400 m-0">
                  {p.billing_model} · {p.entitlement_type}
                  {p.duration_days ? ` · ${p.duration_days}d` : ""}
                  {p.quota ? ` · ${p.quota} uses` : ""}
                  {" · "}
                  {p.price === 0
                    ? "Free"
                    : `${(p.price / 100).toLocaleString()} ${p.currency}`}
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}
              >
                {p.is_active ? "active" : "inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanForm({
  vocab,
  onDone,
  onCancel,
}: {
  vocab: Vocabulary;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    code: "",
    name: "",
    description: "",
    billing_model: vocab.billing_models[0] ?? "duration",
    entitlement_type: vocab.entitlement_types[0] ?? "platform.access",
    duration_days: "30",
    quota: "1",
    price: "0",
    currency: "TZS",
    subject_type: "actor",
    template_id: "", // for hierarchy.instantiate spec
  });
  const [preconditions, setPreconditions] = useState<
    { kind: string; config: Record<string, string> }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const isQuota = f.billing_model === "quota";
  const isDuration =
    f.billing_model === "duration" || f.billing_model === "recurring";
  const isInstantiate = f.entitlement_type === "hierarchy.instantiate";

  const save = useMutation({
    mutationFn: () => {
      const spec: Record<string, unknown> = {};
      if (isInstantiate && f.template_id.trim())
        spec.template_id = f.template_id.trim();

      return api("POST", "subscriptions/admin/plans", {
        code: f.code.trim(),
        name: f.name.trim(),
        description: f.description.trim() || undefined,
        billing_model: f.billing_model,
        entitlement_type: f.entitlement_type,
        entitlement_spec: spec,
        duration_days: isDuration ? parseInt(f.duration_days, 10) : undefined,
        quota: isQuota ? parseInt(f.quota, 10) : undefined,
        price: parseInt(f.price || "0", 10),
        currency: f.currency,
        subject_type: f.subject_type,
        preconditions: preconditions.length ? preconditions : undefined,
      });
    },
    onSuccess: onDone,
    onError: (e: Error) => setMsg(e.message),
  });

  const field = (
    k: keyof typeof f,
    label: string,
    opts?: { type?: string; placeholder?: string },
  ) => (
    <div>
      <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 block mb-0.5">
        {label}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={f[k]}
        onChange={(e) => set(k, e.target.value)}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      />
    </div>
  );

  const select = (k: keyof typeof f, label: string, options: string[]) => (
    <div>
      <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 block mb-0.5">
        {label}
      </label>
      <select
        value={f[k]}
        onChange={(e) => set(k, e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        New plan
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {field("name", "Name", { placeholder: "Pro Access" })}
        {field("code", "Code", { placeholder: "pro_access" })}
        {select("billing_model", "Billing model", vocab.billing_models)}
        {select("entitlement_type", "Entitlement", vocab.entitlement_types)}
        {isDuration &&
          field("duration_days", "Duration (days)", { type: "number" })}
        {isQuota && field("quota", "Quota (uses)", { type: "number" })}
        {field("price", "Price (minor units)", {
          type: "number",
          placeholder: "0 = free",
        })}
        {field("currency", "Currency")}
        {select("subject_type", "Subject", ["actor", "container", "root"])}
        {isInstantiate &&
          field("template_id", "Template / kind id", {
            placeholder: "container_kind_id (blank = any)",
          })}
      </div>

      {/* pre-conditions */}
      <div className="mb-3">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 block mb-1">
          Pre-conditions (must pass before subscribing)
        </label>
        {preconditions.map((pc, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <select
              value={pc.kind}
              onChange={(e) =>
                setPreconditions((prev) =>
                  prev.map((x, xi) =>
                    xi === i ? { ...x, kind: e.target.value } : x,
                  ),
                )
              }
              className="px-2 py-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              {vocab.precondition_kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                setPreconditions((prev) => prev.filter((_, xi) => xi !== i))
              }
              className="text-[11px] text-red-500 hover:text-red-600"
            >
              remove
            </button>
          </div>
        ))}
        {vocab.precondition_kinds.length > 0 && (
          <button
            onClick={() =>
              setPreconditions((prev) => [
                ...prev,
                { kind: vocab.precondition_kinds[0], config: {} },
              ])
            }
            className="text-[11px] text-neutral-500 hover:text-neutral-700 underline"
          >
            + add pre-condition
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !f.name.trim() || !f.code.trim()}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {save.isPending ? "Creating…" : "Create plan"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600"
        >
          Cancel
        </button>
        {msg && <span className="text-[11px] text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
