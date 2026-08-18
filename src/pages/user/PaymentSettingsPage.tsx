import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Admin → Payment Settings. PLATFORM-WIDE, system-admin only.
 *
 * These are the operator's fees and limits per currency — NOT tenant config, so
 * they live in the admin console, not inside a container workspace. The backend
 * gates every write on SystemAccess::isSystemAdmin; this page assumes it's
 * already behind the admin route guard.
 *
 * Fees are basis points (100 bp = 1%) so there's no floating-point money math.
 * Limits are minor units; 0 means "no limit". Multiple currencies can each have
 * their own row — the page lists them and lets you add or edit any.
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

type Settings = {
  currency: string;
  collection_fee_bps: number;
  payout_fee_bps: number;
  collection_flat_fee: number;
  payout_flat_fee: number;
  min_payment: number;
  max_payment: number;
  min_payout: number;
  max_payout: number;
  updated_at?: string;
};

const BLANK: Omit<Settings, "currency"> = {
  collection_fee_bps: 0,
  payout_fee_bps: 0,
  collection_flat_fee: 0,
  payout_flat_fee: 0,
  min_payment: 0,
  max_payment: 0,
  min_payout: 0,
  max_payout: 0,
};

export function PaymentSettingsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");

  const q = useQuery({
    queryKey: ["admin", "payment-settings"],
    queryFn: () => api("GET", "/settings"),
  });

  const rows: Settings[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-black dark:text-white m-0">
          Payment Settings
        </h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + Add currency
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 mt-1 mb-6">
        Platform-wide fees and limits, per currency. Fees are in basis points
        (100 = 1%); limits in minor units (0 = no limit).
      </p>

      {adding && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4">
          <p className="text-sm font-semibold text-black dark:text-white m-0 mb-2">
            New currency settings
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={newCurrency}
              onChange={(e) =>
                setNewCurrency(e.target.value.toUpperCase().slice(0, 3))
              }
              placeholder="TZS"
              className="w-24 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white uppercase"
            />
            <span className="text-[11px] text-neutral-400">
              3-letter ISO code
            </span>
          </div>
          {newCurrency.length === 3 && (
            <SettingsForm
              currency={newCurrency}
              initial={{ currency: newCurrency, ...BLANK }}
              onSaved={() => {
                setAdding(false);
                setNewCurrency("");
                qc.invalidateQueries({
                  queryKey: ["admin", "payment-settings"],
                });
              }}
              onCancel={() => {
                setAdding(false);
                setNewCurrency("");
              }}
            />
          )}
          {newCurrency.length !== 3 && (
            <button
              onClick={() => {
                setAdding(false);
                setNewCurrency("");
              }}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <p className="text-sm text-neutral-400 m-0">
            No payment settings configured yet.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1 m-0">
            Add a currency to set fees and limits.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) =>
            editing === row.currency ? (
              <div
                key={row.currency}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
                  {row.currency}
                </p>
                <SettingsForm
                  currency={row.currency}
                  initial={row}
                  onSaved={() => {
                    setEditing(null);
                    qc.invalidateQueries({
                      queryKey: ["admin", "payment-settings"],
                    });
                  }}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <SettingsCard
                key={row.currency}
                row={row}
                onEdit={() => setEditing(row.currency)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ── read-only card ───────────────────────────────────────────────── */

function SettingsCard({ row, onEdit }: { row: Settings; onEdit: () => void }) {
  const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;
  const money = (m: number) => (m === 0 ? "—" : (m / 100).toLocaleString());

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-semibold text-black dark:text-white m-0">
          {row.currency}
        </p>
        <button
          onClick={onEdit}
          className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <Stat
          label="Collection fee"
          value={pct(row.collection_fee_bps)}
          sub={
            row.collection_flat_fee
              ? `+ ${money(row.collection_flat_fee)}`
              : undefined
          }
        />
        <Stat
          label="Payout fee"
          value={pct(row.payout_fee_bps)}
          sub={
            row.payout_flat_fee ? `+ ${money(row.payout_flat_fee)}` : undefined
          }
        />
        <Stat
          label="Payment limits"
          value={`${money(row.min_payment)} – ${money(row.max_payment)}`}
        />
        <Stat
          label="Payout limits"
          value={`${money(row.min_payout)} – ${money(row.max_payout)}`}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 m-0 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-black dark:text-white m-0 tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-neutral-400 m-0 tabular-nums">{sub}</p>
      )}
    </div>
  );
}

/* ── edit form ────────────────────────────────────────────────────── */

function SettingsForm({
  currency,
  initial,
  onSaved,
  onCancel,
}: {
  currency: string;
  initial: Settings;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    collection_fee_bps: String(initial.collection_fee_bps ?? 0),
    payout_fee_bps: String(initial.payout_fee_bps ?? 0),
    collection_flat_fee: String(initial.collection_flat_fee ?? 0),
    payout_flat_fee: String(initial.payout_flat_fee ?? 0),
    min_payment: String(initial.min_payment ?? 0),
    max_payment: String(initial.max_payment ?? 0),
    min_payout: String(initial.min_payout ?? 0),
    max_payout: String(initial.max_payout ?? 0),
  });
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v.replace(/[^0-9]/g, "") }));

  const save = useMutation({
    mutationFn: () =>
      api(
        "PUT",
        `/settings/${currency}`,
        Object.fromEntries(
          Object.entries(form).map(([k, v]) => [
            k,
            v === "" ? 0 : parseInt(v, 10),
          ]),
        ),
      ),
    onSuccess: () => onSaved(),
    onError: (e: Error) => setMsg(e.message),
  });

  const field = (k: string, label: string, hint?: string) => (
    <div>
      <label className="text-[11px] text-neutral-400 block mb-1">{label}</label>
      <input
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
        inputMode="numeric"
        placeholder="0"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
      />
      {hint && (
        <p className="text-[10px] text-neutral-400 mt-0.5 m-0">{hint}</p>
      )}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {field("collection_fee_bps", "Collection fee (bps)", "100 = 1%")}
        {field("payout_fee_bps", "Payout fee (bps)", "100 = 1%")}
        {field("collection_flat_fee", "Collection flat fee", "minor units")}
        {field("payout_flat_fee", "Payout flat fee", "minor units")}
        {field("min_payment", "Min payment", "0 = no limit")}
        {field("max_payment", "Max payment", "0 = no limit")}
        {field("min_payout", "Min payout", "0 = no limit")}
        {field("max_payout", "Max payout", "0 = no limit")}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Save"}
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
