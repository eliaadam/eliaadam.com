import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faithApi as api, toMajor } from "./faith-api";

type Fund = { id: string; name: string; code: string; restricted: boolean; balance: number; currency: string };
type GType = { id: string; name: string; code: string; recurring: boolean };
type Template = { key: string; label: string; fund_count: number; type_count: number };

/** Configure funds & giving types — or apply a tradition template to start. */
export default function FundsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [newFund, setNewFund] = useState("");
  const [newType, setNewType] = useState("");

  const funds = useQuery({ queryKey: ["faith", "funds", containerId], queryFn: () => api("GET", `/containers/${containerId}/funds`) });
  const types = useQuery({ queryKey: ["faith", "types", containerId], queryFn: () => api("GET", `/containers/${containerId}/giving-types`) });
  const templates = useQuery({ queryKey: ["faith", "templates", containerId], queryFn: () => api("GET", `/containers/${containerId}/templates`) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["faith", "funds", containerId] });
    qc.invalidateQueries({ queryKey: ["faith", "types", containerId] });
  };

  const applyTpl = useMutation({
    mutationFn: (key: string) => api("POST", `/containers/${containerId}/templates/apply`, { template: key }),
    onSuccess: () => { setMsg("Template applied — edit the funds and types as needed."); refresh(); },
    onError: (e: any) => setMsg(e.message),
  });
  const addFund = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/funds`, { name: newFund.trim() }),
    onSuccess: () => { setNewFund(""); refresh(); }, onError: (e: any) => setMsg(e.message),
  });
  const addType = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/giving-types`, { name: newType.trim() }),
    onSuccess: () => { setNewType(""); refresh(); }, onError: (e: any) => setMsg(e.message),
  });

  const fundList: Fund[] = Array.isArray(funds.data) ? funds.data : [];
  const typeList: GType[] = Array.isArray(types.data) ? types.data : [];
  const tplList: Template[] = Array.isArray(templates.data) ? templates.data : [];
  const empty = fundList.length === 0 && typeList.length === 0;
  const input = "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      {empty && (
        <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md p-4">
          <div className="text-sm font-medium text-black dark:text-white mb-1">Start with a template</div>
          <div className="text-[11px] text-neutral-500 mb-3">Pick your tradition to seed funds and giving types — you can edit everything after.</div>
          <div className="flex flex-wrap gap-2">
            {tplList.map((t) => (
              <button key={t.key} onClick={() => applyTpl.mutate(t.key)} disabled={applyTpl.isPending}
                className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white">
                {t.label} <span className="text-neutral-400">({t.fund_count} funds · {t.type_count} types)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium text-black dark:text-white mb-2">Funds</div>
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900 mb-2">
            {fundList.length === 0 ? <div className="px-3 py-2 text-sm text-neutral-500">None yet.</div> :
              fundList.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-black dark:text-white">{f.name} {f.restricted && <span className="text-[10px] text-amber-600">restricted</span>}</span>
                  <span className="text-[11px] text-neutral-400">{toMajor(f.balance)} {f.currency}</span>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input value={newFund} onChange={(e) => setNewFund(e.target.value)} placeholder="New fund name" className={`${input} flex-1`} />
            <button onClick={() => addFund.mutate()} disabled={!newFund.trim()} className="px-3 py-2 text-xs rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">Add</button>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-black dark:text-white mb-2">Giving types</div>
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900 mb-2">
            {typeList.length === 0 ? <div className="px-3 py-2 text-sm text-neutral-500">None yet.</div> :
              typeList.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-black dark:text-white">{t.name}</span>
                  {t.recurring && <span className="text-[10px] text-blue-600">recurring</span>}
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New giving type" className={`${input} flex-1`} />
            <button onClick={() => addType.mutate()} disabled={!newType.trim()} className="px-3 py-2 text-xs rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
