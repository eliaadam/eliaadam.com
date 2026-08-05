import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { procurementApi as api, toMajor, fmtDate } from "./procurement-api";
import ContractExecutionPanel from "./ContractExecutionPanel";

type Contract = { id: string; reference: string; title: string; value: number; currency: string; status: string; procuring_entity_container_id: string; supplier_container_id: string; created_at: string };

/** Contracts this container is party to; open one to run its execution (PayTrack). */
export default function ContractsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const [open, setOpen] = useState<string | null>(null);
  const contracts = useQuery({ queryKey: ["procurement", "contracts", containerId], queryFn: () => api("GET", `/containers/${containerId}/contracts`) });
  const list: Contract[] = Array.isArray(contracts.data) ? contracts.data : [];

  if (open) {
    return (
      <ContractExecutionPanel
        containerId={containerId}
        contractId={open}
        canManage={can("system.procurement.contract.manage")}
        canCertify={can("system.procurement.contract.certify")}
        onClose={() => setOpen(null)}
      />
    );
  }

  return (
    <div className="p-4">
      {contracts.isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No contracts yet. Awards create contracts here.</div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {list.map((c) => (
            <button key={c.id} onClick={() => setOpen(c.id)} className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <div>
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {c.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{c.reference}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === "active" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>{c.status}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {c.procuring_entity_container_id === containerId ? "You are the buyer" : "You are the supplier"} · {fmtDate(c.created_at)}
                </div>
              </div>
              <div className="text-sm text-black dark:text-white">{toMajor(c.value)} {c.currency}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
