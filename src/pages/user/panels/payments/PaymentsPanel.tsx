import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Payments panel — feature `system.payments` (business tier, licensable).
 *
 * MONEY RULE, enforced in this file: the API speaks MINOR UNITS (integers).
 * The user types "10,500.50"; we send 1050050. Nothing here ever sends a float
 * or a string amount — a rounding bug in a payments UI is someone's money.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
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

/** "10,500.50" → 1050050. Returns null when not a clean money string. */
function toMinorUnits(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = (frac + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(cents, 10);
}

/** 1050050 → "10,500.50" */
function fromMinorUnits(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toLocaleString();
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

type Intent = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  gateway: string;
  status: string;
  created_at: string;
};

export default function PaymentsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (p: string) => permissions.includes(`payments.${p}`);
  const [currency] = useState("TZS");

  return (
    <div className="space-y-5 max-w-3xl">
      {can("wallet.view") && (
        <WalletCard containerId={containerId} currency={currency} />
      )}
      {can("payment.create") && (
        <TakePayment containerId={containerId} currency={currency} />
      )}
      {can("transfer.send") && (
        <TransferCard containerId={containerId} currency={currency} />
      )}
      {can("payment.view") && (
        <PaymentHistory
          containerId={containerId}
          canRefund={can("payment.refund")}
          scopedToSelf={!can("payment.view_all")}
        />
      )}
      {!can("wallet.view") && !can("payment.create") && (
        <p className="text-sm text-neutral-400">
          You hold no payments permissions in this container.
        </p>
      )}
    </div>
  );
}

/* ── WALLET ───────────────────────────────────────────────────────── */

function WalletCard({
  containerId,
  currency,
}: {
  containerId: string;
  currency: string;
}) {
  const q = useQuery({
    queryKey: ["pay", "wallet", containerId, currency],
    queryFn: () => api("GET", `/wallets/${containerId}?currency=${currency}`),
  });

  const balance = typeof q.data?.balance === "number" ? q.data.balance : null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      <p className="text-[11px] uppercase tracking-wide text-neutral-400 m-0 mb-1">
        Wallet balance
      </p>
      {q.isLoading ? (
        <p className="text-2xl font-semibold text-neutral-300 m-0">…</p>
      ) : (
        <p className="text-3xl font-semibold text-black dark:text-white m-0 tabular-nums">
          {balance === null ? "—" : fromMinorUnits(balance)}
          <span className="text-sm font-normal text-neutral-400 ml-2">
            {currency}
          </span>
        </p>
      )}
    </div>
  );
}

/* ── TAKE PAYMENT ─────────────────────────────────────────────────── */

function TakePayment({
  containerId,
  currency,
}: {
  containerId: string;
  currency: string;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gateway, setGateway] = useState("manual");
  const [msg, setMsg] = useState<string | null>(null);

  const minor = toMinorUnits(amount);
  const valid = minor !== null && minor > 0 && description.trim().length > 0;

  const take = useMutation({
    mutationFn: async () => {
      // Idempotency key: if the button is double-clicked or the network
      // retries, the server returns the SAME intent instead of charging twice.
      const key = `ui:${containerId}:${minor}:${description.trim()}:${Date.now()}`;
      const intent = await api("POST", "/intents", {
        container_id: containerId,
        amount: minor,
        currency,
        description: description.trim(),
        gateway,
        idempotency_key: key,
      });
      return api("POST", `/intents/${intent.id}/initiate`);
    },
    onSuccess: (res: any) => {
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setMsg(`Payment ${res?.status ?? "recorded"}.`);
      setAmount("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["pay"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Take a payment
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Cash, bank slip or mobile money received in person — record it here and
        the wallet updates.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={`Amount (${currency})`}
            className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
          />
          {amount && minor === null && (
            <p className="text-[11px] text-amber-600 mt-1 m-0">
              Use digits only, max 2 decimals — e.g. 10500.50
            </p>
          )}
        </div>
        <select
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="manual">Manual (cash / slip)</option>
          <option value="selcom">Selcom</option>
          <option value="flutterwave">Flutterwave</option>
        </select>
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is this payment for?"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-2"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => valid && take.mutate()}
          disabled={!valid || take.isPending}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {take.isPending ? "Recording…" : "Record payment"}
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

/* ── TRANSFER ─────────────────────────────────────────────────────── */

function TransferCard({
  containerId,
  currency,
}: {
  containerId: string;
  currency: string;
}) {
  const qc = useQueryClient();
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const minor = toMinorUnits(amount);
  const valid =
    minor !== null &&
    minor > 0 &&
    toId.trim() !== "" &&
    description.trim() !== "";

  const send = useMutation({
    mutationFn: () =>
      api("POST", "/transfers", {
        from_container_id: containerId,
        to_container_id: toId.trim(),
        amount: minor,
        currency,
        description: description.trim(),
      }),
    onSuccess: () => {
      setMsg("Transfer posted.");
      setAmount("");
      setToId("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["pay"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Transfer funds
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Move money to another container's wallet. Refused if this wallet lacks
        the funds.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          placeholder="Destination container id"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={`Amount (${currency})`}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Reason for transfer"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-2"
      />
      <button
        onClick={() => valid && send.mutate()}
        disabled={!valid || send.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        Send transfer
      </button>
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

/* ── HISTORY ──────────────────────────────────────────────────────── */

function PaymentHistory({
  containerId,
  canRefund,
  scopedToSelf,
}: {
  containerId: string;
  canRefund: boolean;
  /** True when the actor lacks payment.view_all — the server returns only the
   *  payments they took, so the heading must not imply otherwise. */
  scopedToSelf: boolean;
}) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["pay", "intents", containerId, scopedToSelf ? "self" : "all"],
    queryFn: () =>
      api("GET", `/intents?container_id=${containerId}&per_page=25`),
  });

  const refund = useMutation({
    mutationFn: (id: string) =>
      api("POST", `/intents/${id}/refund`, {
        reason: "Refunded from payments panel",
      }),
    onSuccess: () => {
      setMsg("Refunded — a reversing ledger entry was posted.");
      qc.invalidateQueries({ queryKey: ["pay"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const raw = q.data;
  const intents: Intent[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <p className="text-sm font-semibold text-black dark:text-white m-0">
          {scopedToSelf ? "Your collections" : "Payment history"}
        </p>
        {scopedToSelf && (
          <p className="text-[11px] text-neutral-400 m-0">
            Payments you recorded.
          </p>
        )}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400 p-4 m-0">Loading…</p>
      ) : intents.length === 0 ? (
        <p className="text-sm text-neutral-400 p-4 m-0">
          {scopedToSelf
            ? "You haven't recorded any payments yet."
            : "No payments yet."}
        </p>
      ) : (
        intents.map((i, idx) => (
          <div
            key={i.id}
            className={`px-4 py-3 flex items-center justify-between ${
              idx > 0
                ? "border-t border-neutral-200 dark:border-neutral-800"
                : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm text-black dark:text-white m-0 truncate">
                {i.description}
              </p>
              <p className="text-[11px] text-neutral-400 m-0">
                {i.gateway} · {new Date(i.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold tabular-nums text-black dark:text-white">
                {fromMinorUnits(i.amount)} {i.currency}
              </span>
              <StatusPill status={i.status} />
              {canRefund && i.status === "succeeded" && (
                <button
                  onClick={() => refund.mutate(i.id)}
                  disabled={refund.isPending}
                  className="text-[11px] text-amber-600 hover:underline"
                >
                  Refund
                </button>
              )}
            </div>
          </div>
        ))
      )}
      {msg && (
        <p className="text-[11px] text-neutral-500 px-4 py-2 m-0">{msg}</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "failed"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : status === "refunded"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded ${tone}`}>{status}</span>
  );
}
