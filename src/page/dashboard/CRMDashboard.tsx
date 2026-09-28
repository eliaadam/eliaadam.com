import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { AccountsTab } from "./crm/AccountsTab";
import { LeadsTab } from "./crm/LeadsTab";
import { PipelineTab } from "./crm/PipelineTab";
import { CasesTab } from "./crm/CasesTab";

/**
 * CRM dashboard shell — four tabs. Contacts and per-record activities
 * live on AccountDetail's own routed page (Contact rides its Account,
 * same as on the backend), not a tab of their own.
 */

type Tab = "accounts" | "leads" | "pipeline" | "cases";

const TABS: { key: Tab; label: string }[] = [
  { key: "accounts", label: "Accounts" },
  { key: "leads", label: "Leads" },
  { key: "pipeline", label: "Pipeline" },
  { key: "cases", label: "Support Cases" },
];

export function CRMDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — CRM data belongs to whichever container
        you're currently in.
      </p>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight">CRM</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Accounts, leads, sales pipeline, and support cases.
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
        {activeTab === "accounts" && <AccountsTab containerId={currentContainerId} />}
        {activeTab === "leads" && <LeadsTab containerId={currentContainerId} />}
        {activeTab === "pipeline" && <PipelineTab containerId={currentContainerId} />}
        {activeTab === "cases" && <CasesTab containerId={currentContainerId} />}
      </div>
    </div>
  );
}
