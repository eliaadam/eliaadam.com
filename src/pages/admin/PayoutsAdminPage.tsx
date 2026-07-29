import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/*
 * Admin → Payouts. PLATFORM-WIDE, system-admin.
 *
 * Payout approval is a platform-operator act — an admin reviews requests across
 * all containers and releases money. So the queue lives here, not in a tenant
 * workspace (a member requests a payout in their workspace; an admin approves it
 * here). The backend endpoints are already platform-wide and enforce
 * SystemAccess.
 *
 * Approve releases the hold; settle triggers the REAL Selcom disbursement.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function pay(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/payments${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

function money(minor: number): string {
  const whole = Math.floor(minor / 100).toLocaleString();
  const frac = String(minor % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

type Payout = {
  id: string;
  container_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  status: string;
  destination_type: string;
  destination_account: string;
  destination_name?: string;
  reference?: string;
  created_at: string;
};

export function PayoutsAdminPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const q = useQuery({
    queryKey: ["admin", "payout-queue"],
    queryFn: () => pay("GET", "/payouts/queue"),
  });

  const act = async (id: string, action: "approve" | "reject" | "settle" | "settle-poll", reason?: string) => {
    setBusy(id + action);
    setMsg(null);
    try {
      await pay("POST", `/payouts/${id}/${action}`, reason ? { reason } : undefined);
      qc.invalidateQueries({ queryKey: ["admin", "payout-queue"] });
      setMsg(
        action === "settle" ? "Settlement triggered — disbursing via Selcom."
        : action === "settle-poll" ? "Polled Selcom for settlement status."
        : `Payout ${action}d.`
      );
      setRejectFor(null);
      setRejectReason("");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  const rows: Payout[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-xl font-bold text-black dark:text-white m-0 mb-1">Payouts</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Payout requests across all containers. Approving releases the hold; settling triggers the real disbursement.
      </p>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">No payouts awaiting action.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-black dark:text-white m-0 tabular-nums">
                    {money(p.amount)} {p.currency}
                    <span className="text-[11px] font-normal text-neutral-400 ml-2">
                      net {money(p.net_amount)}{p.fee > 0 && ` · fee ${money(p.fee)}`}
                    </span>
                  </p>
                  <p className="text-[11px] text-neutral-400 m-0">
                    {p.destination_name ?? "—"} · {p.destination_type} · {p.destination_account}
                  </p>
                  <p className="text-[10px] text-neutral-400 m-0">
                    container {p.container_id.slice(0, 8)} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <PayoutStatus status={p.status} />
              </div>

              <div className="flex gap-2 mt-3">
                {p.status === "requested" && (
                  <>
                    <button onClick={() => act(p.id, "approve")} disabled={busy !== null}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
                      {busy === p.id + "approve" ? "Approving…" : "Approve"}
                    </button>
                    <button onClick={() => setRejectFor(rejectFor === p.id ? null : p.id)} disabled={busy !== null}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                      Reject
                    </button>
                  </>
                )}
                {p.status === "approved" && (
                  <button onClick={() => act(p.id, "settle")} disabled={busy !== null}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-40">
                    {busy === p.id + "settle" ? "Settling…" : "Settle (disburse)"}
                  </button>
                )}
                {p.status === "settling" && (
                  <button onClick={() => act(p.id, "settle-poll")} disabled={busy !== null}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                    {busy === p.id + "settle-poll" ? "Checking…" : "Check status"}
                  </button>
                )}
              </div>

              {rejectFor === p.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection"
                    className="flex-1 px-3 py-1.5 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
                  />
                  <button
                    onClick={() => rejectReason.trim() && act(p.id, "reject", rejectReason.trim())}
                    disabled={!rejectReason.trim() || busy !== null}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-red-600 text-white disabled:opacity-40"
                  >
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {msg && <p className="text-[11px] text-neutral-500 mt-3">{msg}</p>}
    </div>
  );
}

function PayoutStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    requested: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    approved: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    settling: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    paid: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    rejected: "text-neutral-500 bg-neutral-100 dark:bg-neutral-900",
    failed: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}>
      {status}
    </span>
  );
}
