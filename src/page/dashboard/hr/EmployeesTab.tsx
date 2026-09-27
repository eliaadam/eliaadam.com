import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import type { EmployeeStatus } from "../../../lib/sdk/domains/hr";
import { sdk } from "../../../lib/sdk";
 
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: EmployeeStatus): string {
  if (status === "active") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "terminated") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"; // on_leave
}

export function EmployeesTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["hr", "employees", containerId],
    queryFn: () => sdk.hr.listEmployeesForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Employees</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New employee"}
        </button>
      </div>

      {showCreate && (
        <CreateEmployeeForm containerId={containerId} onDone={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {employees && employees.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Users className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No employees yet.</p>
        </div>
      )}

      {employees && employees.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {employees.map((e) => (
            <li key={e.id}>
              <Link
                to={`/dashboard/hr/employees/${e.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{e.employee_number}</p>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(e.status)}`}>
                      {e.status.replace("_", " ")}
                    </span>
                  </div>
                  {e.personal_email && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {e.personal_email}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateEmployeeForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [actorId, setActorId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createEmployee(containerId, {
        actor_id: actorId,
        employee_number: employeeNumber,
        personal_email: personalEmail || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr", "employees", containerId] });
      onDone();
    },
  });

  const canSubmit = Boolean(actorId.trim() && employeeNumber.trim());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Actor id</label>
          <input className={inputClass} value={actorId} onChange={(e) => setActorId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Employee number</label>
          <input className={inputClass} value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Personal email</label>
          <input className={inputClass} value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={onDone} className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white">
          Cancel
        </button>
        {mutation.isError && <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this employee.</p>}
      </div>
    </div>
  );
}
