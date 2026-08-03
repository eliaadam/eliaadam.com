import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { containerKeys } from "./queryKeys";
import { ContainerList } from "./ContainerList";
import { SearchResults } from "./SearchResults";
import { TreeView } from "./TreeView";
import { ContainerDetail } from "./ContainerDetail";
import { CreateContainerForm } from "./CreateContainerForm";
import { maicore } from "../../../lib/maicore";
import type { Container } from "../../../lib/maicore-sdk";

export default function ContainerManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [treeRootId, setTreeRootId] = useState<string | null>(null);

  // Load all containers on mount
  const allContainersQuery = useQuery({
    queryKey: containerKeys.allList,
    queryFn: () => maicore.hierarchy.discovery.list(),
  });

  const allContainers = allContainersQuery.data ?? [];

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setActiveSearch(searchTerm.trim());
    }
  };

  const selectContainer = (c: Container) => {
    setSelectedId(c.id);
    setTreeRootId(c.parent_container_id ? null : c.id);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white m-0">
            Container Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage organizations, teams, and hierarchy
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition flex-shrink-0"
        >
          {showCreate ? "Cancel" : "+ New Container"}
        </button>
      </header>

      {showCreate && (
        <CreateContainerForm
          parentId={null}
          onCreated={(c) => {
            setShowCreate(false);
            setSelectedId(c.id);
            setTreeRootId(c.id);
          }}
        />
      )}

      {/* Search bar — hidden once something is selected on small screens so the
          detail panel gets the full viewport (drill-down navigation pattern). */}
      <div
        className={`${selectedId ? "hidden lg:flex" : "flex"} flex-col sm:flex-row gap-2 mb-6`}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search containers by name, code, or slug…"
          className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim()}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          Search
        </button>
      </div>

      {/* Show all containers when no search active */}
      {!activeSearch && allContainers.length > 0 && (
        <div
          className={`${selectedId ? "hidden lg:block" : "block"} mb-6 lg:mb-0`}
        >
          <ContainerList
            title={`All Containers (${allContainers.length})`}
            containers={allContainers}
            selectedId={selectedId}
            onSelect={selectContainer}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 mt-6 lg:mt-6">
        {/* Left panel: search results + tree. Hidden on small screens once a
            container is selected — the detail view takes over (see onBack). */}
        <div
          className={`${
            selectedId ? "hidden lg:flex" : "flex"
          } w-full lg:w-[360px] flex-shrink-0 flex-col gap-4`}
        >
          {activeSearch && (
            <SearchResults
              query={activeSearch}
              selectedId={selectedId}
              onSelect={selectContainer}
            />
          )}

          {treeRootId && (
            <TreeView
              rootId={treeRootId}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          )}
        </div>

        {/* Right panel: detail */}
        <div
          className={`${selectedId ? "flex" : "hidden lg:flex"} flex-1 min-w-0 flex-col`}
        >
          {selectedId ? (
            <ContainerDetail
              containerId={selectedId}
              onNavigate={(id) => setSelectedId(id)}
              onViewTree={(id) => setTreeRootId(id)}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center w-full">
              <p className="text-sm text-neutral-400 dark:text-neutral-600">
                Search for a container or create one to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
