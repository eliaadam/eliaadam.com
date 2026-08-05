import { useState } from "react";
import MyTendersPanel from "./MyTendersPanel";
import OpenTendersPanel from "./OpenTendersPanel";
import ContractsPanel from "./ContractsPanel";

/**
 * Procurement workspace — the single `system.procurement` panel. Three tabs,
 * two sides of the same container plus post-award execution:
 *
 *   My Tenders   (procuring entity)  create → publish → open → evaluate → award
 *   Open Tenders (tenderer)          browse published tenders + submit sealed bids
 *   Contracts    (either party)      run an awarded contract (PayTrack: IPCs,
 *                                    retention, variations, payments)
 *
 * Each tab self-gates by permission, so a container sees only the sides it can
 * act on (an officer sees Tenders + Contracts; a tenderer/supplier sees Open
 * Tenders + their Contracts).
 */
export default function ProcurementWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);

  const tabs = [
    {
      key: "mine",
      label: "My Tenders",
      show: can("system.procurement.tender.manage"),
    },
    {
      key: "open",
      label: "Open Tenders",
      show: can("system.procurement.bid.submit"),
    },
    {
      key: "contracts",
      label: "Contracts",
      show: can("system.procurement.contract.view"),
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have procurement access here.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {active === "mine" && (
          <MyTendersPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "open" && (
          <OpenTendersPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "contracts" && (
          <ContractsPanel containerId={containerId} permissions={permissions} />
        )}
      </div>
    </div>
  );
}
