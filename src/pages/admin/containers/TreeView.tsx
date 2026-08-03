import { useQuery } from "@tanstack/react-query";
import { system } from "../../../lib/system";
import type { ContainerTreeNode } from "../../../lib/system-sdk";
import { containerKeys } from "./queryKeys";

export function TreeView({
  rootId,
  selectedId,
  onSelect,
}: {
  rootId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const treeQuery = useQuery({
    queryKey: containerKeys.tree(rootId),
    queryFn: () => system.hierarchy.discovery.tree(rootId),
  });

  const nodes = treeQuery.data ?? [];

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          Hierarchy Tree
        </h3>
      </div>

      {treeQuery.isLoading && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
          Loading tree…
        </p>
      )}

      <div className="max-h-[50vh] lg:max-h-[400px] overflow-y-auto overflow-x-auto p-2">
        {nodes.map((node: ContainerTreeNode) => (
          <button
            key={node.container_id}
            onClick={() => onSelect(node.container_id)}
            className={`w-full text-left px-3 py-2.5 lg:py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 active:bg-neutral-200 dark:active:bg-neutral-800 transition ${
              selectedId === node.container_id
                ? "bg-neutral-100 dark:bg-neutral-900 font-medium"
                : ""
            }`}
            style={{ paddingLeft: `${12 + node.depth * 20}px` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-600 text-xs flex-shrink-0">
                {node.child_count > 0 ? "▸" : "·"}
              </span>
              <span className="text-black dark:text-white truncate">
                {node.hierarchy_path.split(".").pop()}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-600 ml-auto flex-shrink-0">
                {node.lifecycle}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
