import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Plus } from "lucide-react";
import type { HRCase, HRCaseType } from "../../../lib/sdk/domains/hr";
import { sdk } from "../../../lib/sdk";
 
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

const CASE_TYPES: HRCaseType[] = ["grievance", "disciplinary", "complaint", "investigation"];

function statusClasses(status: HRCase["status"]): string {
  if (status === "resolved" || status === "closed") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "investigating") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"; // open
}

/**
 * "Sensitive records require strong permissions and audit trails" —
 * this whole tab is gated at core.hr.employee_relations.view/manage,
 * a deliberately separate, stricter permission resource.
 */
export function EmployeeRelationsTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["hr", "hr-cases", containerId],
    queryFn: () => sdk.hr.listHRCasesForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">HR cases</p>
        <button type="button" onClick={() => setShowCreate((v) => !v)} className={`flex items-center gap-1 ${primaryButtonClass}`}>
          <Plus size={13} />
          {showCreate ? "Close" : "New case"}
        </button>
      </div>

      {showCreate && <CreateCaseForm containerId={containerId} onDone={() => setShowCreate(false)} />}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {cases && cases.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <AlertOctagon className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No cases recorded.</p>
        </div>
      )}

      {cases && cases.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {cases.map((c) => (
            <CaseRow key={c.id} hrCase={c} containerId={containerId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseRow({ hrCase, containerId }: { hrCase: HRCase; containerId: string }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hr", "hr-cases", containerId] });

  const investigateMutation = useMutation({ mutationFn: () => sdk.hr.startInvestigatingHRCase(hrCase.id), onSuccess: invalidate });
  const resolveMutation = useMutation({ mutationFn: () => sdk.hr.resolveHRCase(hrCase.id), onSuccess: invalidate });
  const closeMutation = useMutation({ mutationFn: () => sdk.hr.closeHRCase(hrCase.id), onSuccess: invalidate });

  const isTerminal = hrCase.status === "closed";

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {hrCase.type}
          </span>
          <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(hrCase.status)}`}>
            {hrCase.status}
          </span>
          {hrCase.confidential && <span className="text-[11px] text-neutral-400 dark:text-neutral-600">confidential</span>}
        </div>
        {hrCase.description && (
          <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">{hrCase.description}</p>
        )}
      </div>
      {!isTerminal && (
        <div className="flex flex-none items-center gap-2">
          {hrCase.status === "open" && (
            <button type="button" onClick={() => investigateMutation.mutate()} disabled={investigateMutation.isPending} className={secondaryButtonClass}>
              Investigate
            </button>
          )}
          <button type="button" onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending} className={primaryButtonClass}>
            Resolve
          </button>
          <button type="button" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} className={secondaryButtonClass}>
            Close
          </button>
        </div>
      )}
    </li>
  );
}

function CreateCaseForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<HRCaseType>("grievance");
  const [employeeId, setEmployeeId] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () => sdk.hr.createHRCase(containerId, { type, employee_id: employeeId, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "hr-cases", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Type</label>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as HRCaseType)}>
            {CASE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Employee id</label>
          <input className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Description</label>
        <textarea className={`${inputClass} min-h-[3rem]`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={!employeeId.trim() || mutation.isPending} className={primaryButtonClass}>
          {mutation.isPending ? "Creating…" : "Create case"}
        </button>
        <button type="button" onClick={onDone} className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white">
          Cancel
        </button>
        {mutation.isError && <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this case.</p>}
      </div>
    </div>
  );
}
