import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { SellTab } from "./pos/SellTab";
import { SalesTab } from "./pos/SalesTab";

/** Point of Sale — ring up products and services, and take payment now
 * (cash or card/mobile money) or on credit. */

type Tab = "sell" | "sales";

export function PosDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("sell");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — sales belong to whichever container you're
        in.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Point of Sale</h1>

      <div className="mt-4 flex gap-5 border-b border-neutral-200 dark:border-neutral-800">
        {(["sell", "sales"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              activeTab === t
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
            }`}
          >
            {t === "sell" ? "Sell" : "Sales"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === "sell" && <SellTab containerId={currentContainerId} />}
        {activeTab === "sales" && <SalesTab containerId={currentContainerId} />}
      </div>
    </div>
  );
}
