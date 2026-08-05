import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faithApi as api, toMajor, fmtDate } from "./faith-api";

type Fund = { id: string; name: string; currency: string; balance: number };
type GType = { id: string; name: string; recurring: boolean };
type Gift = { id: string; amount: number; currency: string; method: string; given_at: string; giver_name: string | null; anonymous: boolean; fund_id: string | null };

/** Record contributions and view recent giving. */
export default function GivingPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [form, setForm] = useState({ amount: "", fund_id: "", giving_type_id: "", giver_name: "", method: "cash", anonymous: false });
  const [msg, setMsg] = useState<string | null>(null);

  const funds = useQuery({ queryKey: ["faith", "funds", containerId], queryFn: () => api("GET", `/containers/${containerId}/funds`) });
  const types = useQuery({ queryKey: ["faith", "types", containerId], queryFn: () => api("GET", `/containers/${containerId}/giving-types`) });
  const gifts = useQuery({ queryKey: ["faith", "gifts", containerId], queryFn: () => api("GET", `/containers/${containerId}/gifts?limit=50`) });

  const record = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/gifts`, {
      amount: Math.round(parseFloat(form.amount || "0") * 100),
      fund_id: form.fund_id || null,
      giving_type_id: form.giving_type_id || null,
      giver_name: form.anonymous ? null : (form.giver_name || null),
      anonymous: form.anonymous,
      method: form.method,
    }),
    onSuccess: () => {
      setMsg("Contribution recorded.");
      setForm({ ...form, amount: "", giver_name: "" });
      qc.invalidateQueries({ queryKey: ["faith", "gifts", containerId] });
      qc.invalidateQueries({ queryKey: ["faith", "funds", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const fundList: Fund[] = Array.isArray(funds.data) ? funds.data : [];
  const typeList: GType[] = Array.isArray(types.data) ? types.data : [];
  const giftList: Gift[] = Array.isArray(gifts.data) ? gifts.data : [];
  const fundName = (id: string | null) => fundList.find((f) => f.id === id)?.name ?? "—";
  const input = "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      {/* Fund balances */}
      <div className="flex flex-wrap gap-2">
        {fundList.map((f) => (
          <div key={f.id} className="border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2">
            <div className="text-[11px] text-neutral-500">{f.name}</div>
            <div className="text-sm font-semibold text-black dark:text-white">{toMajor(f.balance)} {f.currency}</div>
          </div>
        ))}
      </div>

      {/* Record a gift */}
      {can("system.faith.giving.record") && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 space-y-2">
          <div className="text-sm font-medium text-black dark:text-white">Record a contribution</div>
          <div className="flex flex-wrap gap-2">
            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" min="0" step="0.01" placeholder="Amount" className={`${input} w-32`} />
            <select value={form.fund_id} onChange={(e) => setForm({ ...form, fund_id: e.target.value })} className={input}>
              <option value="">Fund…</option>
              {fundList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={form.giving_type_id} onChange={(e) => setForm({ ...form, giving_type_id: e.target.value })} className={input}>
              <option value="">Type…</option>
              {typeList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={input}>
              {["cash", "mobile", "card", "bank", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={form.giver_name} onChange={(e) => setForm({ ...form, giver_name: e.target.value })} placeholder="Giver name" disabled={form.anonymous} className={`${input} flex-1 min-w-40 disabled:opacity-40`} />
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> Anon
            </label>
            <button onClick={() => record.mutate()} disabled={!form.amount || record.isPending} className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">
              {record.isPending ? "Saving…" : "Record"}
            </button>
          </div>
        </div>
      )}

      {/* Recent gifts */}
      <div>
        <div className="text-sm font-medium text-black dark:text-white mb-2">Recent contributions</div>
        {giftList.length === 0 ? (
          <div className="text-sm text-neutral-500">No contributions yet.</div>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
            {giftList.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="text-black dark:text-white">{g.anonymous ? "Anonymous" : (g.giver_name || "—")}</span>
                  <span className="text-[11px] text-neutral-400 ml-2">{fundName(g.fund_id)} · {g.method} · {fmtDate(g.given_at)}</span>
                </div>
                <div className="text-black dark:text-white">{toMajor(g.amount)} {g.currency}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
