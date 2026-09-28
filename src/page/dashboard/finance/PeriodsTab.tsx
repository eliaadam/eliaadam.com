import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { badgeClass, cardClass, errorMessage, errorTextClass, formatDate, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./ui";

export function PeriodsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: periods, isLoading, error } = useQuery({
    queryKey: ["finance", "periods", containerId],
    queryFn: () => sdk.finance.listPeriods(containerId),
  });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance", "periods", containerId] });
  const create = useMutation({
    mutationFn: () => sdk.finance.createPeriod(containerId, { name: name.trim(), start_date: startDate, end_date: endDate }),
    onSuccess: () => { refresh(); setCreating(false); setName(""); setStartDate(""); setEndDate(""); },
  });
  const close = useMutation({ mutationFn: (id: string) => sdk.finance.closePeriod(containerId, id), onSuccess: refresh });
  const reopen = useMutation({ mutationFn: (id: string) => sdk.finance.reopenPeriod(containerId, id), onSuccess: refresh });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          A closed period refuses new postings dated inside it. Periods don't have to cover every date — a date in no
          period at all can still be posted to.
        </p>
        <button type="button" onClick={() => setCreating((v) => !v)} className={primaryButtonClass}>
          {creating ? "Cancel" : "New period"}
        </button>
      </div>

      {creating && (
        <div className={`p-4 ${cardClass}`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={`mb-1 block ${labelClass}`}>Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 2026" />
            </div>
            <div>
              <label className={`mb-1 block ${labelClass}`}>Start date</label>
              <input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={`mb-1 block ${labelClass}`}>End date</label>
              <input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => create.mutate()}
              disabled={!name.trim() || !startDate || !endDate || create.isPending}
              className={primaryButtonClass}
            >
              {create.isPending ? "Creating…" : "Create period"}
            </button>
            {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create the period.")}</p>}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load periods.")}</p>}

      {periods && (
        <ul className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {periods.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className={badgeClass}>{p.status === "closed" ? "Closed" : "Open"}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
                  {formatDate(p.start_date)} – {formatDate(p.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.status === "open" ? (
                  <button type="button" onClick={() => close.mutate(p.id)} disabled={close.isPending} className={secondaryButtonClass}>
                    Close
                  </button>
                ) : (
                  <button type="button" onClick={() => reopen.mutate(p.id)} disabled={reopen.isPending} className={secondaryButtonClass}>
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
          {periods.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No periods defined yet.</li>}
        </ul>
      )}
      {(close.isError || reopen.isError) && <p className={errorTextClass}>{errorMessage(close.error ?? reopen.error, "That change was refused.")}</p>}
    </div>
  );
}
