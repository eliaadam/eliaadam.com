import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Folder } from "lucide-react";
import { sdk, type Container } from "../../lib/sdk";

/**
 * One expandable node in the container hierarchy tree. Children are
 * lazy-loaded on first expand (via `sdk.container.listChildren`), not
 * fetched all at once — a real container tree could be arbitrarily
 * deep/wide, and Container's own read API has no bulk "give me the
 * whole subtree annotated with depth" shape besides `descendants()`,
 * which doesn't preserve parent/child grouping for rendering anyway.
 */
export function ContainerTreeNode({
  container,
  depth = 0,
}: {
  container: Container;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  const { data: children, isLoading } = useQuery({
    queryKey: ["admin", "container-children", container.id],
    queryFn: () => sdk.container.listChildren(container.id),
    enabled: expanded,
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      >
        <ChevronRight
          size={14}
          className={`flex-none text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <Folder size={14} className="flex-none text-neutral-400" />
        <span className="truncate font-medium">{container.display_name}</span>
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-500">
          {container.slug}
        </span>
        <span
          className={`ml-auto flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${
            container.status === "active"
              ? "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {container.status}
        </span>
      </button>

      {expanded && (
        <div>
          {isLoading && (
            <p
              className="py-1 text-xs text-neutral-500 dark:text-neutral-500"
              style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.5}rem` }}
            >
              Loading…
            </p>
          )}
          {children && children.length === 0 && (
            <p
              className="py-1 text-xs text-neutral-500 dark:text-neutral-500"
              style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.5}rem` }}
            >
              No children
            </p>
          )}
          {children?.map((child) => (
            <ContainerTreeNode
              key={child.id}
              container={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
