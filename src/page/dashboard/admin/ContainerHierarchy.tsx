import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { useContainer } from "../../../components/context/ContainerContext";
import { ContainerTreeNode } from "../../../components/admin/ContainerTreeNode";

/**
 * Starts from the CURRENT container (from `ContainerContext`) and
 * walks up via `listAncestors` to find its true root, then renders the
 * whole tree from there down. There's no "list every root container"
 * endpoint (Container's own `GET /containers/` is explicitly 501 —
 * "listing is not implemented yet because the repository contract has
 * no list() method" — see the backend's own `views.py`), so an admin
 * browses one tree at a time, starting from wherever they're currently
 * acting. Switch containers (top of the sidebar) to browse a different
 * tree.
 */
export function ContainerHierarchy() {
  const { currentContainerId, currentContainer } = useContainer();

  const { data: ancestors, isLoading } = useQuery({
    queryKey: ["admin", "container-ancestors", currentContainerId],
    queryFn: () => sdk.container.listAncestors(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId || !currentContainer) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">
          Container hierarchy
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          No container selected.
        </p>
      </div>
    );
  }

  const root =
    ancestors && ancestors.length > 0 ? ancestors[0] : currentContainer;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">
        Container hierarchy
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        The full tree rooted at{" "}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {root.display_name}
        </span>{" "}
        — the root ancestor of your currently selected container.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
        {isLoading ? (
          <div className="h-10 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-900" />
        ) : (
          <ContainerTreeNode container={root} />
        )}
      </div>
    </div>
  );
}
