import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

/*
 * Admin → Vouchers. Create grant vouchers (redeeming gives a plan free) or
 * discount vouchers (reduces a plan's price). Look up a code to see its status
 * and redemptions.
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

export function VouchersPage() {
  const [created, setCreated] = useState<any | null>(null);
  const [lookupCode, setLookupCode] = useState("");
  const [looked, setLooked] = useState<any | null>(null);
  const [lookErr, setLookErr] = useState<string | null>(null);

  const plansQ = useQuery({ queryKey: ["sub-plans"], queryFn: () => api("GET", "subscriptions/admin/plans") });
  const plans = Array.isArray(plansQ.data) ? plansQ.data : [];

  const [f, setF] = useState({
    type: "grant", plan_id: "", discount_percent: "", discount_flat: "",
    max_redemptions: "", per_actor_limit: "1", valid_until: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [msg, setMsg] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api("POST", "subscriptions/admin/vouchers", {
      type: f.type,
      plan_id: f.plan_id || undefined,
      discount_percent: f.type === "discount" && f.discount_percent ? parseInt(f.discount_percent, 10) : undefined,
      discount_flat: f.type === "discount" && f.discount_flat ? parseInt(f.discount_flat, 10) : undefined,
      max_redemptions: f.max_redemptions ? parseInt(f.max_redemptions, 10) : undefined,
      per_actor_limit: parseInt(f.per_actor_limit || "1", 10),
      valid_until: f.valid_until || undefined,
    }),
    onSuccess: (data) => { setCreated(data); setMsg(null); },
    onError: (e: Error) => setMsg(e.message),
  });

  const lookup = async () => {
    setLookErr(null); setLooked(null);
    try {
      setLooked(await api("GET", `subscriptions/admin/vouchers/${encodeURIComponent(lookupCode.trim())}`));
    } catch (e: any) { setLookErr(e.message); }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">Vouchers</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Grant vouchers give a plan free; discount vouchers reduce its price. Share the code for redemption.
      </p>

      {/* create */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
        <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">Create voucher</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Type</label>
            <select value={f.type} onChange={(e) => set("type", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white">
              <option value="grant">Grant (free)</option>
              <option value="discount">Discount</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Plan</label>
            <select value={f.plan_id} onChange={(e) => set("plan_id", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white">
              <option value="">Select a plan…</option>
              {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {f.type === "discount" && (
            <>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-0.5">Discount %</label>
                <input value={f.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} inputMode="numeric" placeholder="e.g. 20"
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-0.5">…or flat off (minor units)</label>
                <input value={f.discount_flat} onChange={(e) => set("discount_flat", e.target.value)} inputMode="numeric"
                  className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Max redemptions (blank = unlimited)</label>
            <input value={f.max_redemptions} onChange={(e) => set("max_redemptions", e.target.value)} inputMode="numeric"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Per-actor limit</label>
            <input value={f.per_actor_limit} onChange={(e) => set("per_actor_limit", e.target.value)} inputMode="numeric"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400 block mb-0.5">Valid until (optional)</label>
            <input type="date" value={f.valid_until} onChange={(e) => set("valid_until", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white" />
          </div>
        </div>

        <button onClick={() => create.mutate()} disabled={create.isPending || !f.plan_id}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
          {create.isPending ? "Creating…" : "Create voucher"}
        </button>
        {msg && <p className="text-[11px] text-red-600 mt-2 m-0">{msg}</p>}

        {created && (
          <div className="mt-3 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <p className="text-[11px] text-neutral-500 m-0">Voucher created — share this code:</p>
            <p className="text-lg font-bold tracking-wider text-emerald-700 dark:text-emerald-400 m-0">{created.code}</p>
          </div>
        )}
      </div>

      {/* lookup */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <p className="text-sm font-semibold text-black dark:text-white m-0 mb-2">Look up a voucher</p>
        <div className="flex gap-2">
          <input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="VOUCHER-CODE"
            className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white uppercase" />
          <button onClick={lookup} disabled={!lookupCode.trim()}
            className="px-3 py-2 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">Look up</button>
        </div>
        {lookErr && <p className="text-[11px] text-red-600 mt-2 m-0">{lookErr}</p>}
        {looked && (
          <div className="mt-3 text-[11px] text-neutral-500">
            <p className="m-0"><span className="font-semibold">{looked.code}</span> · {looked.type} · {looked.status}</p>
            <p className="m-0">Redeemed {looked.redemption_count}{looked.max_redemptions ? ` / ${looked.max_redemptions}` : ""} times</p>
          </div>
        )}
      </div>
    </div>
  );
}
