import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../lib/maicore";

/*
 * Admin → Subscriptions. Oversight + rescue.
 *
 * The operational reality: a user pays, the gateway callback is delayed or lost,
 * and their subscription sits `pending` forever. This page lets an admin see all
 * subscriptions, filter to the pending ones, and MANUALLY ACTIVATE — the rescue.
 *
 * Manual activation is money-sensitive: it treats the subscription as paid. So
 * the page shows the payment context (is there a linked intent?) and warns
 * before activating something with no payment behind it. The admin is the
 * operator and sometimes the gateway genuinely failed after taking money — but
 * the action is deliberate, not casual.
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

function money(minor?: number, currency?: string) {
  if (minor == null) return "—";
  return minor === 0 ? "Free" : `${(minor / 100).toLocaleString()} ${currency ?? ""}`;
}

type Sub = {
  id: string;
  plan_id: string;
  plan_name?: string;
  plan_price?: number;
  plan_currency?: string;
  subject_id: string;
  subject_type: string;
  billing_model: string;
  entitlement_type: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
  quota_total?: number;
  quota_used?: number;
  payment_intent_id?: string;
  created_at: string;
};

const STATUSES = ["pending", "active", "expired", "depleted", "cancelled"];

export function SubscriptionsAdminPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");

  const q = useQuery({
    queryKey: ["admin", "subs", status],
    queryFn: () => api("GET", `subscriptions/admin/subscriptions${status ? `?status=${status}` : ""}`),
  });

  const rows: Sub[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">Subscriptions</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-5">
        Track subscriptions and rescue ones stuck pending after a failed payment callback.
      </p>

      {/* status filter */}
      <div className="flex gap-1 mb-5">
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
              status === s ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            {s || "all"}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">No {status || ""} subscriptions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => <SubCard key={s.id} sub={s} onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "subs"] })} />)}
        </div>
      )}
    </div>
  );
}

function SubCard({ sub, onChanged }: { sub: Sub; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmActivate, setConfirmActivate] = useState(false);

  // Resolve the subject to a name where possible (actors only).
  const actorQ = useQuery({
    queryKey: ["actor-name", sub.subject_id],
    queryFn: () => userApi.searchActors(sub.subject_id),
    enabled: sub.subject_type === "actor",
  });
  const actorName = Array.isArray(actorQ.data)
    ? actorQ.data.find((a: any) => a.id === sub.subject_id)?.display_name
    : undefined;

  const act = async (action: "activate" | "cancel") => {
    setBusy(action); setMsg(null);
    try {
      await api("POST", `subscriptions/admin/subscriptions/${sub.id}/${action}`);
      onChanged();
      setMsg(action === "activate" ? "Activated." : "Cancelled.");
      setConfirmActivate(false);
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(null); }
  };

  const hasPayment = Boolean(sub.payment_intent_id);
  const isPaidPlan = (sub.plan_price ?? 0) > 0;
  const activateIsRisky = sub.status === "pending" && isPaidPlan && !hasPayment;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-black dark:text-white m-0">
            {sub.plan_name ?? "Plan"} <span className="text-[11px] font-normal text-neutral-400">· {money(sub.plan_price, sub.plan_currency)}</span>
          </p>
          <p className="text-[11px] text-neutral-400 m-0">
            {sub.subject_type}: {actorName ?? sub.subject_id.slice(0, 12) + "…"}
          </p>
          <p className="text-[11px] text-neutral-400 m-0">
            {sub.billing_model} · {sub.entitlement_type}
            {sub.quota_total ? ` · ${sub.quota_used ?? 0}/${sub.quota_total} used` : ""}
            {sub.ends_at ? ` · until ${new Date(sub.ends_at).toLocaleDateString()}` : ""}
          </p>
        </div>
        <SubStatus status={sub.status} />
      </div>

      {/* payment context — the money-sensitive info for a rescue decision */}
      {sub.status === "pending" && (
        <div className={`mt-3 p-2 rounded-md text-[11px] ${
          hasPayment ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
            : isPaidPlan ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
            : "bg-neutral-50 dark:bg-neutral-900 text-neutral-500"
        }`}>
          {hasPayment
            ? `Payment intent linked (${sub.payment_intent_id!.slice(0, 12)}…). Verify it settled before activating.`
            : isPaidPlan
              ? "⚠ No payment linked, and this is a paid plan. Activating gives it away for free — only do this if you've confirmed payment out-of-band."
              : "Free plan — safe to activate."}
        </div>
      )}

      {/* actions */}
      <div className="flex gap-2 mt-3">
        {sub.status === "pending" && (
          <>
            {!confirmActivate ? (
              <button onClick={() => activateIsRisky ? setConfirmActivate(true) : act("activate")} disabled={busy !== null}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md disabled:opacity-40 ${
                  activateIsRisky ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                }`}>
                {busy === "activate" ? "Activating…" : "Activate manually"}
              </button>
            ) : (
              <>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 self-center">Activate an unpaid subscription?</span>
                <button onClick={() => act("activate")} disabled={busy !== null}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-amber-600 text-white disabled:opacity-40">
                  Yes, activate
                </button>
                <button onClick={() => setConfirmActivate(false)}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700">
                  Cancel
                </button>
              </>
            )}
          </>
        )}
        {(sub.status === "pending" || sub.status === "active") && !confirmActivate && (
          <button onClick={() => act("cancel")} disabled={busy !== null}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-40">
            {busy === "cancel" ? "…" : "Cancel"}
          </button>
        )}
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function SubStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    active: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    expired: "text-neutral-500 bg-neutral-100 dark:bg-neutral-900",
    depleted: "text-neutral-500 bg-neutral-100 dark:bg-neutral-900",
    cancelled: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}>{status}</span>;
}
