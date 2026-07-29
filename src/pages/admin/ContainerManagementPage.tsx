import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maicore } from "../../lib/maicore";
import type {
  Container,
  ContainerTreeNode,
  ContainerVisibility,
  ContainerStatus,
  MaicoreValidationError,
} from "../../lib/maicore-sdk";
import { templateApi } from "../../lib/maicore";
const keys = {
  search: (q: string) => ["admin", "containers", "search", q] as const,
  tree: (id: string) => ["admin", "containers", "tree", id] as const,
  container: (id: string) => ["admin", "containers", "detail", id] as const,
  children: (id: string) => ["admin", "containers", "children", id] as const,
  policy: (id: string) => ["admin", "containers", "policy", id] as const,
  containerKinds: ["admin", "containerKinds"] as const,
};
function ContainerList({
  title,
  containers,
  selectedId,
  onSelect,
}: {
  title: string;
  containers: Container[];
  selectedId: string | null;
  onSelect: (c: Container) => void;
}) {
  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          {title}
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {containers.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
              selectedId === c.id ? "bg-neutral-100 dark:bg-neutral-900" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">
                  {c.display_name}
                </p>
                <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  {c.path}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={c.status} />
                {!c.parent_container_id && (
                  <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase">
                    root
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export default function ContainerManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [treeRootId, setTreeRootId] = useState<string | null>(null);
  // Load all containers on mount
  const allContainersQuery = useQuery({
    queryKey: ["admin", "containers", "all"],
    queryFn: () => maicore.hierarchy.discovery.list(),
  });

  const allContainers = allContainersQuery.data ?? [];
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setActiveSearch(searchTerm.trim());
    }
  };

  return (
    <div className="p-8 max-w-[1200px]">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Container Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage organizations, teams, and hierarchy
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
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

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
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
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          Search
        </button>
      </div>
      {/* Show all containers when no search active */}
      {!activeSearch && allContainers.length > 0 && (
        <ContainerList
          title={`All Containers (${allContainers.length})`}
          containers={allContainers}
          selectedId={selectedId}
          onSelect={(c) => {
            setSelectedId(c.id);
            setTreeRootId(c.parent_container_id ? null : c.id);
          }}
        />
      )}
      <div className="flex gap-6">
        {/* Left panel: search results + tree */}
        <div className="w-[360px] flex-shrink-0 flex flex-col gap-4">
          {activeSearch && (
            <SearchResults
              query={activeSearch}
              selectedId={selectedId}
              onSelect={(c) => {
                setSelectedId(c.id);
                setTreeRootId(c.parent_container_id ? null : c.id);
              }}
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
        <div className="flex-1 min-w-0">
          {selectedId ? (
            <ContainerDetail
              containerId={selectedId}
              onNavigate={(id) => {
                setSelectedId(id);
              }}
              onViewTree={(id) => {
                setTreeRootId(id);
              }}
            />
          ) : (
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
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

// ── Search Results ────────────────────────────────────────────────
function SearchResults({
  query,
  selectedId,
  onSelect,
}: {
  query: string;
  selectedId: string | null;
  onSelect: (c: Container) => void;
}) {
  const searchQuery = useQuery({
    queryKey: keys.search(query),
    queryFn: () => maicore.hierarchy.discovery.search({ q: query, limit: 20 }),
    enabled: !!query,
  });

  const results = searchQuery.data ?? [];

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          Search: "{query}" ({results.length})
        </h3>
      </div>

      {searchQuery.isLoading && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
          Searching…
        </p>
      )}

      {searchQuery.isError && (
        <p className="text-xs text-black dark:text-white p-4 text-center font-medium">
          Search failed.{" "}
          <button
            onClick={() => searchQuery.refetch()}
            className="underline underline-offset-2"
          >
            Retry
          </button>
        </p>
      )}

      {!searchQuery.isLoading && results.length === 0 && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
          No containers found.
        </p>
      )}

      <div className="max-h-[300px] overflow-y-auto">
        {results.map((c: Container) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
              selectedId === c.id ? "bg-neutral-100 dark:bg-neutral-900" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">
                  {c.display_name}
                </p>
                <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  {c.code}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tree View ─────────────────────────────────────────────────────
function TreeView({
  rootId,
  selectedId,
  onSelect,
}: {
  rootId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const treeQuery = useQuery({
    queryKey: keys.tree(rootId),
    queryFn: () => maicore.hierarchy.discovery.tree(rootId),
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

      <div className="max-h-[400px] overflow-y-auto p-2">
        {nodes.map((node: ContainerTreeNode) => (
          <button
            key={node.container_id}
            onClick={() => onSelect(node.container_id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition ${
              selectedId === node.container_id
                ? "bg-neutral-100 dark:bg-neutral-900 font-medium"
                : ""
            }`}
            style={{ paddingLeft: `${12 + node.depth * 20}px` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 dark:text-neutral-600 text-xs">
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

// ── Container Detail ──────────────────────────────────────────────
function ContainerDetail({
  containerId,
  onNavigate,
  onViewTree,
}: {
  containerId: string;
  onNavigate: (id: string) => void;
  onViewTree: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const containerQuery = useQuery({
    queryKey: keys.container(containerId),
    queryFn: () => maicore.hierarchy.containers.get(containerId),
  });

  const childrenQuery = useQuery({
    queryKey: keys.children(containerId),
    queryFn: () => maicore.hierarchy.discovery.children(containerId),
  });

  const container = containerQuery.data;
  const children = childrenQuery.data ?? [];

  const lifecycleMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case "activate":
          return maicore.hierarchy.containers.activate(containerId);
        case "suspend":
          return maicore.hierarchy.containers.suspend(containerId);
        case "archive":
          return maicore.hierarchy.containers.archive(containerId);
        case "restore":
          return maicore.hierarchy.containers.restore(containerId);
        case "delete":
          await maicore.hierarchy.containers.delete(containerId);
          return null;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.container(containerId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "containers"] });
      setConfirming(null);
    },
  });

  if (containerQuery.isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-600">
          Loading container…
        </p>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-600">
          Container not found.
        </p>
      </div>
    );
  }

  const availableActions = getContainerActions(container.status);

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white m-0">
              {container.display_name}
            </h2>
            <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400 mt-1">
              {container.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={container.status} />
            {!container.parent_container_id && (
              <span className="inline-block px-2 py-[3px] text-[11px] font-semibold rounded-full uppercase tracking-wide border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
                root
              </span>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-5">
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
            <div className="flex items-center gap-2">
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
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition ${
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
                className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                View Tree
              </button>
              <button
                onClick={() => setShowPolicy(!showPolicy)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
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
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
            Children ({children.length})
          </h3>
          <button
            onClick={() => setShowCreateChild(!showCreateChild)}
            className="text-xs font-semibold text-black dark:text-white"
          >
            {showCreateChild ? "Cancel" : "+ Add Child"}
          </button>
        </div>

        {showCreateChild && (
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <CreateContainerForm
              parentId={containerId}
              onCreated={(c) => {
                setShowCreateChild(false);
                queryClient.invalidateQueries({
                  queryKey: keys.children(containerId),
                });
                queryClient.invalidateQueries({
                  queryKey: ["admin", "containers"],
                });
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
            className="w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition flex items-center justify-between"
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

// ── Policy Section ────────────────────────────────────────────────
function PolicySection({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const policyQuery = useQuery({
    queryKey: keys.policy(containerId),
    queryFn: async () => {
      try {
        return await maicore.hierarchy.policies.get(containerId);
      } catch {
        return null;
      }
    },
  });

  const [form, setForm] = useState({
    maximum_depth: "",
    maximum_children: "",
    allow_transfers: true,
    allow_invitations: true,
    allow_public_discovery: false,
    default_visibility: "private" as string,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      maicore.hierarchy.policies.apply(containerId, {
        maximum_depth: form.maximum_depth
          ? Number(form.maximum_depth)
          : undefined,
        maximum_children: form.maximum_children
          ? Number(form.maximum_children)
          : undefined,
        allow_transfers: form.allow_transfers,
        allow_invitations: form.allow_invitations,
        allow_public_discovery: form.allow_public_discovery,
        default_visibility: form.default_visibility as
          | "public"
          | "protected"
          | "private",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.policy(containerId) });
      setEditing(false);
    },
  });

  const policy = policyQuery.data;

  // Sync form when policy loads
  const startEdit = () => {
    if (policy) {
      setForm({
        maximum_depth: policy.maximum_depth?.toString() ?? "",
        maximum_children: policy.maximum_children?.toString() ?? "",
        allow_transfers: policy.allow_transfers,
        allow_invitations: policy.allow_invitations,
        allow_public_discovery: policy.allow_public_discovery,
        default_visibility: policy.default_visibility ?? "private",
      });
    }
    setEditing(true);
  };

  const inputBase =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-black dark:text-white m-0">
          Hierarchy Policy
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs font-semibold text-black dark:text-white"
          >
            {policy ? "Edit" : "Apply Policy"}
          </button>
        )}
      </div>

      {policyQuery.isLoading && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Loading policy…
        </p>
      )}

      {!policyQuery.isLoading && !policy && !editing && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          No policy configured. Defaults apply (unlimited depth, children, all
          operations allowed).
        </p>
      )}

      {!editing && policy && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailItem
            label="Max Depth"
            value={policy.maximum_depth?.toString() ?? "Unlimited"}
          />
          <DetailItem
            label="Max Children"
            value={policy.maximum_children?.toString() ?? "Unlimited"}
          />
          <DetailItem
            label="Transfers"
            value={policy.allow_transfers ? "Allowed" : "Blocked"}
          />
          <DetailItem
            label="Invitations"
            value={policy.allow_invitations ? "Allowed" : "Blocked"}
          />
          <DetailItem
            label="Discovery"
            value={policy.allow_public_discovery ? "Public" : "Hidden"}
          />
          <DetailItem
            label="Default Visibility"
            value={policy.default_visibility}
          />
        </div>
      )}

      {editing && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Max Depth (blank = unlimited)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.maximum_depth}
                onChange={(e) =>
                  setForm({ ...form, maximum_depth: e.target.value })
                }
                placeholder="Unlimited"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Max Children (blank = unlimited)
              </label>
              <input
                type="number"
                min="0"
                value={form.maximum_children}
                onChange={(e) =>
                  setForm({ ...form, maximum_children: e.target.value })
                }
                placeholder="Unlimited"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Default Visibility
              </label>
              <select
                value={form.default_visibility}
                onChange={(e) =>
                  setForm({ ...form, default_visibility: e.target.value })
                }
                className={inputBase}
              >
                <option value="public">Public</option>
                <option value="protected">Protected</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <Toggle
              label="Transfers"
              checked={form.allow_transfers}
              onChange={(v) => setForm({ ...form, allow_transfers: v })}
            />
            <Toggle
              label="Invitations"
              checked={form.allow_invitations}
              onChange={(v) => setForm({ ...form, allow_invitations: v })}
            />
            <Toggle
              label="Public Discovery"
              checked={form.allow_public_discovery}
              onChange={(v) => setForm({ ...form, allow_public_discovery: v })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
            >
              {applyMutation.isPending ? "Saving…" : "Apply Policy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Container Form ─────────────────────────────────────────
function CreateContainerForm({
  parentId,
  onCreated,
}: {
  parentId: string | null;
  onCreated: (c: Container) => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [kindId, setKindId] = useState("");
  const kindsQuery = useQuery({
    queryKey: ["admin", "containerKinds"],
    queryFn: () =>
      templateApi.listKinds() as Promise<
        Array<{ id: string; code: string; display_name: string }>
      >,
  });
  const kinds = kindsQuery.data ?? [];
  const [visibility, setVisibility] = useState<ContainerVisibility>("private");

  // Auto-generate slug from code
  const handleCodeChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setCode(clean);
    if (!slug || slug === code.replace(/_/g, "-")) {
      setSlug(clean.replace(/_/g, "-"));
    }
  };

  // Container kinds — seeded server-side, fetch from search workaround
  // For now, allow typing the kind ID manually or loading from a cached list

  const createMutation = useMutation({
    mutationFn: () =>
      maicore.hierarchy.containers.create({
        code,
        slug,
        display_name: displayName,
        description: description || undefined,
        kind: kindId,
        visibility,
        parent_id: parentId ?? undefined,
      }),
    onSuccess: (container) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "containers"] });
      setCode("");
      setSlug("");
      setDisplayName("");
      setDescription("");
      onCreated(container);
    },
  });

  let errorMessage: string | null = null;
  let fieldErrors: Record<string, string[]> | null = null;

  if (createMutation.error) {
    const err = createMutation.error;
    if (typeof err === "object" && err !== null && "errors" in err) {
      fieldErrors = (err as MaicoreValidationError).errors;
      errorMessage = (err as MaicoreValidationError).message;
    } else {
      errorMessage =
        err instanceof Error ? err.message : "Failed to create container.";
    }
  }

  const fieldError = (field: string): string | null =>
    fieldErrors?.[field]?.[0] ?? null;

  const inputBase =
    "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {parentId ? "Create Child Container" : "Create Root Container"}
      </h3>

      {errorMessage && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          ! {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Code *
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="acme-corp"
            className={`${inputBase} ${fieldError("code") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
          />
          {fieldError("code") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("code")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Slug *
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-corp"
            className={`${inputBase} ${fieldError("slug") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
          />
          {fieldError("slug") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("slug")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Acme Corporation"
            className={`${inputBase} ${fieldError("display_name") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
          />
          {fieldError("display_name") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("display_name")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Container Kind ID *
          </label>
          <select
            value={kindId}
            onChange={(e) => setKindId(e.target.value)}
            className={`${inputBase} ${fieldError("kind") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
          >
            <option value="">Select kind…</option>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.display_name} ({k.code})
              </option>
            ))}
          </select>
          {fieldError("kind") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("kind")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Visibility *
          </label>
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as ContainerVisibility)
            }
            className={`${inputBase} border-neutral-300 dark:border-neutral-700`}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className={`${inputBase} border-neutral-300 dark:border-neutral-700`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => createMutation.mutate()}
          disabled={
            createMutation.isPending ||
            !code ||
            !slug ||
            !displayName ||
            !kindId
          }
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {createMutation.isPending ? "Creating…" : "Create Container"}
        </button>
      </div>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────
function StatusBadge({ status }: { status: ContainerStatus }) {
  const base =
    "inline-block px-2 py-[3px] text-[11px] font-semibold rounded-full uppercase tracking-wide";

  if (status === "active") {
    return (
      <span
        className={`${base} bg-black text-white dark:bg-white dark:text-black`}
      >
        {status}
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        className={`${base} border border-black dark:border-white text-black dark:text-white`}
      >
        {status}
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span
        className={`${base} border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400`}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400`}
    >
      {status}
    </span>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  onClick,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-900">
      <span className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium">
        {label}
      </span>
      {onClick ? (
        <button
          onClick={onClick}
          className={`text-[13px] text-black dark:text-white underline underline-offset-2 text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}
        >
          {value}
        </button>
      ) : (
        <span
          className={`text-[13px] text-black dark:text-white text-right max-w-[60%] truncate ${mono ? "font-mono text-xs" : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked
            ? "bg-black dark:bg-white"
            : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${
            checked
              ? "translate-x-[18px] bg-white dark:bg-black"
              : "translate-x-[3px] bg-white dark:bg-black"
          }`}
        />
      </button>
      <span className="text-[13px] text-neutral-700 dark:text-neutral-300 font-medium">
        {label}
      </span>
    </label>
  );
}

function getContainerActions(status: ContainerStatus): string[] {
  switch (status) {
    case "draft":
      return ["activate", "delete"];
    case "active":
      return ["suspend", "archive"];
    case "suspended":
      return ["activate", "archive"];
    case "archived":
      return ["restore", "delete"];
    default:
      return [];
  }
}
