import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Container } from "../../../lib/system-sdk";
import { containerKeys } from "./queryKeys";
import { getContainerActions } from "./containerActions";
import { StatusBadge } from "./StatusBadge";
import { DetailItem } from "./DetailItem";
import { PolicySection } from "./PolicySection";
import { CreateContainerForm } from "./CreateContainerForm";
import { system } from "../../../lib/system";

export function ContainerDetail({
  containerId,
  onNavigate,
  onViewTree,
  onBack,
}: {
  containerId: string;
  onNavigate: (id: string) => void;
  onViewTree: (id: string) => void;
  /** Clears the current selection; used to return to the list on small screens. */
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const containerQuery = useQuery({
    queryKey: containerKeys.container(containerId),
    queryFn: () => system.hierarchy.containers.get(containerId),
  });

  const childrenQuery = useQuery({
    queryKey: containerKeys.children(containerId),
    queryFn: () => system.hierarchy.discovery.children(containerId),
  });

  const container = containerQuery.data;
  const children = childrenQuery.data ?? [];

  const lifecycleMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case "activate":
          return system.hierarchy.containers.activate(containerId);
        case "suspend":
          return system.hierarchy.containers.suspend(containerId);
        case "archive":
          return system.hierarchy.containers.archive(containerId);
        case "restore":
          return system.hierarchy.containers.restore(containerId);
        case "delete":
          await system.hierarchy.containers.delete(containerId);
          return null;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: containerKeys.container(containerId),
      });
      queryClient.invalidateQueries({ queryKey: containerKeys.all });
      setConfirming(null);
    },
  });

  const BackButton = () => (
    <button
      onClick={onBack}
      className="lg:hidden inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3"
    >
      <span aria-hidden>←</span> Back to list
    </button>
  );

  if (containerQuery.isLoading) {
    return (
      <div>
        <BackButton />
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
          <p className="text-sm text-neutral-400 dark:text-neutral-600">
            Loading container…
          </p>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div>
        <BackButton />
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
          <p className="text-sm text-neutral-400 dark:text-neutral-600">
            Container not found.
          </p>
        </div>
      </div>
    );
  }

  const availableActions = getContainerActions(container.status);

  return (
    <div className="flex flex-col gap-4">
      <BackButton />

      {/* Header card */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-black dark:text-white m-0 truncate">
              {container.display_name}
            </h2>
            <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400 mt-1 truncate">
              {container.code}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={container.status} />
            {!container.parent_container_id && (
              <span className="hidden sm:inline-block px-2 py-[3px] text-[11px] font-semibold rounded-full uppercase tracking-wide border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
                root
              </span>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 sm:gap-y-3 text-sm mb-5">
          <DetailItem label="ID" value={container.id} mono />
          <DetailItem label="Slug" value={container.slug} />
          <DetailItem label="Path" value={container.path} mono />
          <DetailItem label="Visibility" value={container.visibility} />
          <DetailItem
            label="Parent"
            value={container.parent_container_id ?? "None (root)"}
            mono={!!container.parent_container_id}
            onClick={
              container.parent_container_id
                ? () => onNavigate(container.parent_container_id!)
                : undefined
            }
          />
          <DetailItem label="Version" value={String(container.version)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
                {confirming} this container?
              </span>
              <button
                onClick={() => lifecycleMutation.mutate(confirming)}
                disabled={lifecycleMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
              >
                {lifecycleMutation.isPending ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {availableActions.map((action) => (
                <button
                  key={action}
                  onClick={() => setConfirming(action)}
                  className={`px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md border transition ${
                    action === "delete"
                      ? "border-black dark:border-white text-black dark:text-white font-semibold"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
              <button
                onClick={() => onViewTree(container.id)}
                className="px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                View Tree
              </button>
              <button
                onClick={() => setShowPolicy(!showPolicy)}
                className="px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                {showPolicy ? "Hide Policy" : "Policy"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Policy section */}
      {showPolicy && <PolicySection containerId={containerId} />}

      {/* Children */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center gap-2">
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
            Children ({children.length})
          </h3>
          <button
            onClick={() => setShowCreateChild(!showCreateChild)}
            className="text-xs font-semibold text-black dark:text-white flex-shrink-0"
          >
            {showCreateChild ? "Cancel" : "+ Add Child"}
          </button>
        </div>

        {showCreateChild && (
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <CreateContainerForm
              parentId={containerId}
              onCreated={(c: Container) => {
                setShowCreateChild(false);
                queryClient.invalidateQueries({
                  queryKey: containerKeys.children(containerId),
                });
                queryClient.invalidateQueries({ queryKey: containerKeys.all });
                onNavigate(c.id);
              }}
            />
          </div>
        )}

        {childrenQuery.isLoading && (
          <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
            Loading children…
          </p>
        )}

        {children.length === 0 && !childrenQuery.isLoading && (
          <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
            No children.
          </p>
        )}

        {children.map((child: Container) => (
          <button
            key={child.id}
            onClick={() => onNavigate(child.id)}
            className="w-full text-left px-4 py-3.5 lg:py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800 transition flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-black dark:text-white truncate">
                {child.display_name}
              </p>
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                {child.code}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={child.status} />
              <span className="text-neutral-400 dark:text-neutral-600">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
