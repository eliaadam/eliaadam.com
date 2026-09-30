import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { ContentTab } from "./content/ContentTab";
import { ContentTypesTab } from "./content/ContentTypesTab";
import { pillTabClass } from "./content/ui";

/** Content — generic, configurable content with versioning, five
 * composable structures, and a genuinely public publishing path. */

type Tab = "types" | "content";

export function ContentDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("content");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Content</h1>

      <div className="mt-4 flex gap-1.5 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <button
          type="button"
          className={pillTabClass(activeTab === "content")}
          onClick={() => setActiveTab("content")}
        >
          Content
        </button>
        <button
          type="button"
          className={pillTabClass(activeTab === "types")}
          onClick={() => setActiveTab("types")}
        >
          Content Types
        </button>
      </div>

      <div className="mt-5">
        {activeTab === "content" && (
          <ContentTab containerId={currentContainerId} />
        )}
        {activeTab === "types" && (
          <ContentTypesTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}
