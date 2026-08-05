import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { faithApi as api } from "./faith-api";
import GivingPanel from "./GivingPanel";
import FundsPanel from "./FundsPanel";
import PledgesPanel from "./PledgesPanel";

/** Faith workspace — Giving module. Tabs self-gate by permission. */
export default function FaithWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);

  // If no funds/types configured yet, nudge toward a template.
  const funds = useQuery({
    queryKey: ["faith", "funds", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/funds`),
  });
  const notConfigured = Array.isArray(funds.data) && funds.data.length === 0;

  const tabs = [
    { key: "giving", label: "Giving", show: can("system.faith.giving.view") },
    { key: "pledges", label: "Pledges", show: can("system.faith.giving.view") },
    {
      key: "funds",
      label: "Funds & Setup",
      show: can("system.faith.giving.manage"),
    },
  ].filter((t) => t.show);
  const [active, setActive] = useState(
    notConfigured && can("system.faith.giving.manage")
      ? "funds"
      : (tabs[0]?.key ?? ""),
  );

  if (tabs.length === 0)
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have giving access here.
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t.key ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {active === "giving" && (
          <GivingPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "pledges" && (
          <PledgesPanel containerId={containerId} permissions={permissions} />
        )}
        {active === "funds" && (
          <FundsPanel containerId={containerId} permissions={permissions} />
        )}
      </div>
    </div>
  );
}
