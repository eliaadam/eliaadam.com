import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { errorMessage, expiryClasses, expiryLabel, inputClass } from "./ui";

const WINDOWS = [
  { days: 7, label: "Next 7 days" },
  { days: 30, label: "Next 30 days" },
  { days: 90, label: "Next 90 days" },
  { days: 180, label: "Next 6 months" },
  { days: 365, label: "Next year" },
];

export function ExpiringTab({ containerId }: { containerId: string }) {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory-catalog", "expiring", containerId, days],
    queryFn: () => sdk.inventoryCatalog.listExpiring(containerId, { withinDays: days }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select className={`${inputClass} max-w-[12rem]`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {WINDOWS.map((w) => (
            <option key={w.days} value={w.days}>{w.label}</option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">Includes items that have already expired. Archived items are left out.</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(error, "Couldn't load expiring items.")}</p>}

      {data && data.results.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
          Nothing expires in this window.
        </p>
      )}

      {data && data.results.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {data.results.map((r) => (
            <li key={r.item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.item.title}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {[r.attributes.sku, r.attributes.batch_number && `batch ${r.attributes.batch_number}`, r.attributes.expiry_date]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${expiryClasses(r.attributes.expiry_status)}`}>
                {expiryLabel(r.attributes.expiry_status, r.attributes.days_until_expiry)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
