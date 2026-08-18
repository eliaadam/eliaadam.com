import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Payment links — a shareable URL others pay without an account. Create with a
 * fixed amount or leave it open (payer chooses). The public pay page lives at
 * /public/pay/{slug}; we surface the copyable link.
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
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = (frac + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(cents, 10);
}

function fromMinorUnits(minor: number): string {
  const whole = Math.floor(minor / 100).toLocaleString();
  const frac = String(minor % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

type Link = {
  id: string;
  slug: string;
  title: string;
  amount: number | null;
  currency: string;
  mode: string;
  status: string;
  payment_count: number;
  total_collected: number;
};

export default function LinksPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (p: string) => permissions.includes(`payments.${p}`);

  return (
    <div className="space-y-5 max-w-3xl">
      {can("link.manage") && <CreateLink containerId={containerId} />}
      {can("link.view") && (
        <LinkList containerId={containerId} canManage={can("link.manage")} />
      )}
      {!can("link.view") && !can("link.manage") && (
        <p className="text-sm text-neutral-400">
          You don't have access to payment links here.
        </p>
      )}
    </div>
  );
}

function CreateLink({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("reusable");
  const [msg, setMsg] = useState<string | null>(null);

  const minor = amount.trim() === "" ? null : toMinorUnits(amount);
  const amountInvalid = amount.trim() !== "" && minor === null;
  const valid = title.trim().length > 0 && !amountInvalid;

  const create = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/links`, {
        title: title.trim(),
        amount: minor ?? undefined,
        currency: "TZS",
        mode,
      }),
    onSuccess: () => {
      setMsg("Link created.");
      setTitle("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["links"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Create a payment link
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's this for? (e.g. Membership fee)"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white mb-2"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Amount (blank = payer chooses)"
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        >
          <option value="reusable">Reusable</option>
          <option value="single_use">Single use</option>
        </select>
      </div>
      {amountInvalid && (
        <p className="text-[11px] text-amber-600 m-0 mb-2">
          Use digits only, max 2 decimals.
        </p>
      )}
      <button
        onClick={() => valid && create.mutate()}
        disabled={!valid || create.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {create.isPending ? "Creating…" : "Create link"}
      </button>
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function LinkList({
  containerId,
  canManage,
}: {
  containerId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["links", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/links`),
  });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api("PATCH", `/containers/${containerId}/links/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
  });

  const publicUrl = (slug: string) => `${API}/public/pay/${slug}`;

  const copy = (slug: string) => {
    navigator.clipboard?.writeText(publicUrl(slug));
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  const rows: Link[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Payment links
      </p>
      {q.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No links yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((l) => (
            <div
              key={l.id}
              className="py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black dark:text-white m-0">
                    {l.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 m-0 tabular-nums">
                    {l.amount !== null
                      ? `${fromMinorUnits(l.amount)} ${l.currency}`
                      : "Open amount"}{" "}
                    · {l.mode} · {l.payment_count} paid
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    l.status === "active"
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                      : "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"
                  }`}
                >
                  {l.status}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copy(l.slug)}
                  className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700"
                >
                  {copied === l.slug ? "Copied!" : "Copy link"}
                </button>
                {canManage && (
                  <button
                    onClick={() =>
                      toggle.mutate({
                        id: l.id,
                        status: l.status === "active" ? "disabled" : "active",
                      })
                    }
                    disabled={toggle.isPending}
                    className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
                  >
                    {l.status === "active" ? "Disable" : "Enable"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
