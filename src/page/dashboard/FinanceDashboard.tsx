import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { SettingsTab } from "./finance/SettingsTab";
import { AccountsTab } from "./finance/AccountsTab";
import { RolesTab } from "./finance/RolesTab";
import { PeriodsTab } from "./finance/PeriodsTab";
import { JournalsTab } from "./finance/JournalsTab";
import { ReportsTab } from "./finance/ReportsTab";
import { PostingQueueTab } from "./finance/PostingQueueTab";

/**
 * Finance — the double-entry books: chart of accounts, journals, fiscal
 * periods, financial reports, and the queue of automatic postings waiting
 * on something (an unmapped role, a closed period…).
 */

type Tab = "journals" | "accounts" | "roles" | "periods" | "reports" | "queue" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "journals", label: "Journals" },
  { key: "accounts", label: "Chart of accounts" },
  { key: "roles", label: "Account roles" },
  { key: "periods", label: "Periods" },
  { key: "reports", label: "Reports" },
  { key: "queue", label: "Posting queue" },
  { key: "settings", label: "Settings" },
];

export function FinanceDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("journals");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — the books belong to whichever container you're in.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Finance</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Double-entry books: the chart of accounts, journal entries, fiscal periods, and financial statements.
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
        {activeTab === "journals" && <JournalsTab containerId={currentContainerId} />}
        {activeTab === "accounts" && <AccountsTab containerId={currentContainerId} />}
        {activeTab === "roles" && <RolesTab containerId={currentContainerId} />}
        {activeTab === "periods" && <PeriodsTab containerId={currentContainerId} />}
        {activeTab === "reports" && <ReportsTab containerId={currentContainerId} />}
        {activeTab === "queue" && <PostingQueueTab containerId={currentContainerId} />}
        {activeTab === "settings" && <SettingsTab containerId={currentContainerId} />}
      </div>
    </div>
  );
}
