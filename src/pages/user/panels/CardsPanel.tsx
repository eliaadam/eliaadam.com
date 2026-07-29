import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/*
 * Virtual cards. Issuance is KYC-gated on the backend — if the cardholder has no
 * approved KYC, the API refuses and we surface that message. The card number is
 * never shown here; "Send details" tells Selcom to text a secure link to the
 * cardholder. SUSPEND is permanent — the UI confirms before doing it.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

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

type Card = {
  id: string;
  actor_id: string;
  status: string;
  holder_name?: string;
  last_four?: string;
  currency?: string;
  created_at: string;
};

export default function CardsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (p: string) => permissions.includes(`vcn.${p}`);

  return (
    <div className="space-y-5 max-w-3xl">
      {can("card.issue") && <IssueCard containerId={containerId} />}
      {can("card.view") && <CardList containerId={containerId} canManage={can("card.manage")} />}
      {!can("card.view") && !can("card.issue") && (
        <p className="text-sm text-neutral-400">You don't have access to cards here.</p>
      )}
    </div>
  );
}

function IssueCard({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [holder, setHolder] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [account, setAccount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const valid = holder.trim() && msisdn.trim() && account.trim();

  const issue = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/cards`, {
        cardholder_actor_id: holder.trim(),
        msisdn: msisdn.trim(),
        account: account.trim(),
        currency: "TZS",
      }),
    onSuccess: () => {
      setMsg("Card issuance started. It becomes active once Selcom confirms — refresh its status shortly.");
      setHolder("");
      setMsisdn("");
      setAccount("");
      qc.invalidateQueries({ queryKey: ["cards"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">Issue a virtual card</p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        The cardholder must have an approved KYC record — issuance is refused otherwise. Card details go to the holder by secure link, never shown here.
      </p>

      <div className="space-y-2 mb-2">
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Cardholder actor ID"
          className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
            placeholder="Phone (msisdn)"
            className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account"
            className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
        </div>
      </div>

      <button
        onClick={() => valid && issue.mutate()}
        disabled={!valid || issue.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {issue.isPending ? "Issuing…" : "Issue card"}
      </button>

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function CardList({ containerId, canManage }: { containerId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["cards", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/cards`),
  });

  const act = async (id: string, action: "refresh" | "freeze" | "unfreeze" | "suspend" | "show") => {
    if (action === "suspend" && !confirm("Suspend is permanent — the card can never be used again. Continue?")) return;
    setBusy(id + action);
    setMsg(null);
    try {
      const res = await api("POST", `/containers/${containerId}/cards/${id}/${action}`);
      if (action === "show") setMsg(res?.sent ? "Secure link sent to the cardholder." : "Could not send link.");
      qc.invalidateQueries({ queryKey: ["cards"] });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  const rows: Card[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">Cards</p>
      {q.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No cards issued.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black dark:text-white m-0">
                    {c.holder_name ?? "Cardholder"}
                    {c.last_four && <span className="text-neutral-400"> ···· {c.last_four}</span>}
                  </p>
                  <p className="text-[11px] text-neutral-400 m-0">{c.currency ?? ""}</p>
                </div>
                <CardStatus status={c.status} />
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {c.status === "pending" && (
                  <button onClick={() => act(c.id, "refresh")} disabled={busy !== null}
                    className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                    {busy === c.id + "refresh" ? "Checking…" : "Refresh status"}
                  </button>
                )}
                {c.status === "active" && (
                  <>
                    <button onClick={() => act(c.id, "show")} disabled={busy !== null}
                      className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                      Send details
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => act(c.id, "freeze")} disabled={busy !== null}
                          className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                          Freeze
                        </button>
                        <button onClick={() => act(c.id, "suspend")} disabled={busy !== null}
                          className="px-3 py-1 text-[11px] font-semibold rounded-md text-red-600 border border-red-200 dark:border-red-900/40 disabled:opacity-40">
                          Suspend
                        </button>
                      </>
                    )}
                  </>
                )}
                {c.status === "blocked" && canManage && (
                  <button onClick={() => act(c.id, "unfreeze")} disabled={busy !== null}
                    className="px-3 py-1 text-[11px] font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40">
                    Unfreeze
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

function CardStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    active: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    blocked: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    suspended: "text-red-600 bg-red-50 dark:bg-red-950/30",
    failed: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}>
      {status}
    </span>
  );
}
