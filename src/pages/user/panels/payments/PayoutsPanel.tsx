import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Payouts — money OUT. Two audiences in one panel, permission-gated:
 *   - a member with payments.payout.request can request a payout
 *   - a system admin sees the approval queue (approve / reject / settle)
 *
 * Settlement is the real Selcom disbursement; the UI just triggers it and shows
 * the resulting status. Same minor-units rule as the rest of payments.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api/payments${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}

function toMinorUnits(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = (frac + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(cents, 10);
}

function fromMinorUnits(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toLocaleString();
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

type Payout = {
  id: string;
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

export default function PayoutsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (p: string) => permissions.includes(`payments.${p}`);

  return (
    <div className="space-y-5 max-w-3xl">
      {can("payout.request") && <RequestPayout containerId={containerId} />}
      {can("payout.view") && <MyPayouts containerId={containerId} />}
      {!can("payout.request") && !can("payout.view") && (
        <p className="text-sm text-neutral-400">
          You don't have access to payouts here.
        </p>
      )}
    </div>
  );
}

/* ── REQUEST ──────────────────────────────────────────────────────── */

function RequestPayout({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [currency] = useState("TZS");
  const [destType, setDestType] = useState("bank");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const minor = toMinorUnits(amount);
  const valid = minor !== null && minor > 0 && account.trim().length > 0;

  const request = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/payouts`, {
        amount: minor,
        currency,
        destination_type: destType,
        destination_account: account.trim(),
        destination_name: name.trim() || undefined,
        reference: reference.trim() || undefined,
      }),
    onSuccess: () => {
      setMsg("Payout requested. It needs approval before it's paid.");
      setAmount("");
      setAccount("");
      setName("");
      setReference("");
      qc.invalidateQueries({ queryKey: ["payout"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Request a payout
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Money leaves the wallet only after an administrator approves. You can
        request; you can't approve your own.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={`Amount (${currency})`}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
        />
        <select
          value={destType}
          onChange={(e) => setDestType(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="bank">Bank (Qwiksend)</option>
          <option value="mobile">Mobile money</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Account / phone number"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipient name (optional)"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
      </div>

      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference (optional)"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-2"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => valid && request.mutate()}
          disabled={!valid || request.isPending}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {request.isPending ? "Requesting…" : "Request payout"}
        </button>
        {minor !== null && minor > 0 && (
          <span className="text-[11px] text-neutral-400 tabular-nums">
            = {fromMinorUnits(minor)} {currency}
          </span>
        )}
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

/* ── MY PAYOUTS ───────────────────────────────────────────────────── */

function MyPayouts({ containerId }: { containerId: string }) {
  const q = useQuery({
    queryKey: ["payout", "mine", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/payouts`),
  });

  const rows: Payout[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Payouts
      </p>
      {q.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No payouts yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
            >
              <div>
                <p className="text-sm text-black dark:text-white m-0 tabular-nums">
                  {fromMinorUnits(p.amount)} {p.currency}
                </p>
                <p className="text-[11px] text-neutral-400 m-0">
                  {p.destination_type} · {p.destination_account}
                  {p.fee > 0 && ` · fee ${fromMinorUnits(p.fee)}`}
                </p>
              </div>
              <PayoutStatus status={p.status} />
            </div>
          ))}
        </div>
      )}
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
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}
    >
      {status}
    </span>
  );
}
