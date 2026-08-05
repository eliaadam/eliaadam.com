import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faithApi as api, toMajor, fmtDate } from "./faith-api";

type Pledge = { id: string; giver_name: string | null; amount: number; fulfilled_amount: number; currency: string; frequency: string; status: string; fund_id: string | null };
type Fund = { id: string; name: string };

/** Pledges — commitments and their fulfilment. */
export default function PledgesPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [form, setForm] = useState({ giver_name: "", amount: "", fund_id: "", frequency: "monthly" });

  const pledges = useQuery({ queryKey: ["faith", "pledges", containerId], queryFn: () => api("GET", `/containers/${containerId}/pledges`) });
  const funds = useQuery({ queryKey: ["faith", "funds", containerId], queryFn: () => api("GET", `/containers/${containerId}/funds`) });

  const create = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/pledges`, {
      giver_name: form.giver_name || null,
      amount: Math.round(parseFloat(form.amount || "0") * 100),
      fund_id: form.fund_id || null,
      frequency: form.frequency,
    }),
    onSuccess: () => { setForm({ ...form, giver_name: "", amount: "" }); qc.invalidateQueries({ queryKey: ["faith", "pledges", containerId] }); },
  });

  const list: Pledge[] = Array.isArray(pledges.data) ? pledges.data : [];
  const fundList: Fund[] = Array.isArray(funds.data) ? funds.data : [];
  const input = "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4">
      {can("system.faith.giving.manage") && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 flex flex-wrap gap-2 items-center">
          <input value={form.giver_name} onChange={(e) => setForm({ ...form, giver_name: e.target.value })} placeholder="Giver name" className={`${input} flex-1 min-w-40`} />
          <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" min="0" step="0.01" placeholder="Amount" className={`${input} w-32`} />
          <select value={form.fund_id} onChange={(e) => setForm({ ...form, fund_id: e.target.value })} className={input}>
            <option value="">Fund…</option>
            {fundList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={input}>
            {["one_off", "weekly", "monthly", "quarterly", "annual"].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={() => create.mutate()} disabled={!form.amount || create.isPending} className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">Pledge</button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-sm text-neutral-500">No pledges yet.</div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {list.map((p) => {
            const pct = p.amount > 0 ? Math.min(100, Math.round((p.fulfilled_amount / p.amount) * 100)) : 0;
            return (
              <div key={p.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-black dark:text-white">{p.giver_name || "—"} <span className="text-[11px] text-neutral-400">{p.frequency}</span></span>
                  <span className="text-[11px] text-neutral-500">{toMajor(p.fulfilled_amount)} / {toMajor(p.amount)} {p.currency} · {pct}%</span>
                </div>
                <div className="h-1.5 mt-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
