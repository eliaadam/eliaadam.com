import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { CatalogTab } from "./inventory-catalog/CatalogTab";
import { ExpiringTab } from "./inventory-catalog/ExpiringTab";
import { FieldLabelsTab } from "./inventory-catalog/FieldLabelsTab";

/**
 * Inventory catalog — the tree of products/services with their attributes,
 * the items nearing expiry, and the per-container labels that give the
 * reserved generic fields their meaning.
 */

type Tab = "catalog" | "expiring" | "fields";

const TABS: { key: Tab; label: string }[] = [
  { key: "catalog", label: "Catalog" },
  { key: "expiring", label: "Expiring" },
  { key: "fields", label: "Field labels" },
];

export function InventoryCatalogDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("catalog");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — the catalog belongs to whichever container you're in.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Catalog</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Nest products and services, and record the details your business needs.
      </p>

      <div className="mt-4 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "catalog" && <CatalogTab containerId={currentContainerId} />}
        {activeTab === "expiring" && <ExpiringTab containerId={currentContainerId} />}
        {activeTab === "fields" && <FieldLabelsTab containerId={currentContainerId} />}
      </div>
    </div>
  );
}
