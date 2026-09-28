import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { BrowseTab } from "./template-library/BrowseTab";
import { InstalledTab } from "./template-library/InstalledTab";
import { MyTemplatesTab } from "./template-library/MyTemplatesTab";
import { TemplateDetailView } from "./template-library/TemplateDetailView";

/**
 * Template Library shell — browse public templates, author your own with
 * collaborators, and apply templates to the container you're in.
 */

type Tab = "browse" | "mine" | "installed";

const TABS: { key: Tab; label: string }[] = [
  { key: "browse", label: "Browse" },
  { key: "mine", label: "My templates" },
  { key: "installed", label: "Installed here" },
];

export function TemplateLibraryDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — templates are applied to whichever container
        you're currently in.
      </p>
    );
  }

  if (openTemplateId) {
    return (
      <div className="max-w-5xl">
        <TemplateDetailView
          key={openTemplateId}
          templateId={openTemplateId}
          containerId={currentContainerId}
          onBack={() => setOpenTemplateId(null)}
          onOpen={setOpenTemplateId}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Share and reuse configurations, starter content and files.
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
        {activeTab === "browse" && (
          <BrowseTab
            containerId={currentContainerId}
            onOpen={setOpenTemplateId}
          />
        )}
        {activeTab === "mine" && (
          <MyTemplatesTab
            containerId={currentContainerId}
            onOpen={setOpenTemplateId}
          />
        )}
        {activeTab === "installed" && (
          <InstalledTab
            containerId={currentContainerId}
            onOpen={setOpenTemplateId}
          />
        )}
      </div>
    </div>
  );
}
