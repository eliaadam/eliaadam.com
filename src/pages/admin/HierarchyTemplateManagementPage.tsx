import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateApi } from "../../lib/system";
import { InstantiationRuleEditor } from "./InstantiationRuleEditor";
import type {
  HierarchyTemplate,
  HierarchyTemplateNode,
  ContainerTemplate,
  InstantiateResult,
} from "../../lib/template-types";

const keys = {
  templates: ["admin", "hierarchyTemplates"] as const,
  containerTemplates: ["admin", "containerTemplates"] as const,
};

export default function HierarchyTemplateManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [instantiateId, setInstantiateId] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: keys.templates,
    queryFn: () =>
      templateApi.listHierarchies() as Promise<HierarchyTemplate[]>,
  });

  const templates = templatesQuery.data ?? [];

  return (
    <div className="p-8 max-w-[1100px]">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Hierarchy Templates
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Compose container templates into tree structures. Instantiate to
            create entire hierarchies.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setViewId(null);
            setInstantiateId(null);
          }}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
        >
          {showCreate ? "Cancel" : "+ New Hierarchy"}
        </button>
      </header>

      {showCreate && <HierarchyForm onDone={() => setShowCreate(false)} />}
      {instantiateId && (
        <InstantiateForm
          templateId={instantiateId}
          onDone={() => setInstantiateId(null)}
        />
      )}

      {templatesQuery.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {!templatesQuery.isLoading && templates.length === 0 && !showCreate && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          No hierarchy templates yet. Create container templates first.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {templates.map((t) => (
          <HierarchyCard
            key={t.id}
            template={t}
            expanded={viewId === t.id}
            onToggle={() => setViewId(viewId === t.id ? null : t.id)}
            onInstantiate={() => {
              setInstantiateId(t.id);
              setViewId(null);
            }}
          />
        ))}
      </div>
      <InstantiatedContainers />
    </div>
  );
}

function HierarchyCard({
  template: t,
  expanded,
  onToggle,
  onInstantiate,
}: {
  template: HierarchyTemplate;
  expanded: boolean;
  onToggle: () => void;
  onInstantiate: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => templateApi.deleteHierarchy(t.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.templates }),
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "hierarchyTemplates", t.id],
    queryFn: () => templateApi.getHierarchy(t.id) as Promise<HierarchyTemplate>,
    enabled: expanded,
  });

  const enrichedStructure = detailQuery.data?.structure ?? t.structure;

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-semibold text-black dark:text-white m-0">
                {t.display_name}
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                {t.code}
              </span>
            </div>
            {t.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
                {t.description}
              </p>
            )}
            <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 mt-1 m-0">
              {t.id}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0 ml-4">
            <button
              onClick={onInstantiate}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
            >
              Instantiate
            </button>
            <button
              onClick={onToggle}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              {expanded ? "Collapse" : "Preview"}
            </button>
            <button
              onClick={() => setShowRules((s) => !s)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              {showRules ? "Hide Rules" : "Rules"}
            </button>
            {confirming ? (
              <>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
                >
                  {deleteMutation.isPending ? "…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && enrichedStructure && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50 dark:bg-neutral-900">
          <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
            Structure Preview
          </h4>
          <TreePreview node={enrichedStructure} depth={0} />
        </div>
      )}

      {showRules && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50 dark:bg-neutral-900">
          <InstantiationRuleEditor target="template" targetId={t.id} />
        </div>
      )}
    </div>
  );
}

function TreePreview({
  node,
  depth,
}: {
  node: HierarchyTemplateNode;
  depth: number;
}) {
  const children = node.children ?? [];
  const name =
    (node as any).template_name ?? node.template_id?.slice(0, 8) ?? "?";
  const kind = (node as any).kind_name ?? "";

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        <span className="text-neutral-400 dark:text-neutral-600 text-xs">
          {depth === 0 ? "◈" : children.length > 0 ? "├─" : "└─"}
        </span>
        <span className="text-sm font-medium text-black dark:text-white">
          {name}
        </span>
        {node.code_suffix && (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            _{node.code_suffix}
          </span>
        )}
        {kind && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
            {kind}
          </span>
        )}
      </div>
      {children.map((child, i) => (
        <TreePreview
          key={`${child.template_id}-${i}`}
          node={child}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function HierarchyForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();

  const ctQuery = useQuery({
    queryKey: keys.containerTemplates,
    queryFn: () => templateApi.listTemplates() as Promise<ContainerTemplate[]>,
  });
  const containerTemplates = ctQuery.data ?? [];

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [structure, setStructure] = useState<HierarchyTemplateNode>({
    template_id: "",
    code_suffix: "",
    children: [],
  });

  const mutation = useMutation({
    mutationFn: () =>
      templateApi.createHierarchy({
        code,
        name,
        display_name: displayName,
        description: description || undefined,
        structure,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.templates });
      onDone();
    },
  });

  const fieldErrors = (mutation.error as any)?.errors as
    | Record<string, string[]>
    | undefined;
  const fe = (f: string) => fieldErrors?.[f]?.[0] ?? null;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        Create Hierarchy Template
      </h3>

      {mutation.error && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          {(mutation.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Code *
          </label>
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
            }
            placeholder="standard-org"
            className={`${inputCls} ${fe("code") ? "!border-black dark:!border-white" : ""}`}
          />
          {fe("code") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fe("code")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Standard Organization"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name *
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Standard Organization"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </div>
      </div>

      <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
        Tree Structure
      </h4>

      {containerTemplates.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4">
          Create container templates first.
        </p>
      ) : (
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 mb-6 border border-neutral-200 dark:border-neutral-800">
          <NodeEditor
            node={structure}
            onChange={setStructure}
            containerTemplates={containerTemplates}
            depth={0}
            isRoot
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            !name ||
            !displayName ||
            !code ||
            !structure.template_id
          }
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {mutation.isPending ? "Saving…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function NodeEditor({
  node,
  onChange,
  containerTemplates,
  depth,
  isRoot = false,
  onRemove,
}: {
  node: HierarchyTemplateNode;
  onChange: (n: HierarchyTemplateNode) => void;
  containerTemplates: ContainerTemplate[];
  depth: number;
  isRoot?: boolean;
  onRemove?: () => void;
}) {
  const children = node.children ?? [];
  const selectCls =
    "px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none";
  const inputSmCls =
    "px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none w-32";

  return (
    <div style={{ paddingLeft: `${depth * 20}px` }}>
      <div className="flex items-center gap-2 py-2">
        <span className="text-neutral-400 dark:text-neutral-600 text-xs w-4 text-center flex-shrink-0">
          {isRoot ? "◈" : "├"}
        </span>
        <select
          value={node.template_id}
          onChange={(e) => onChange({ ...node, template_id: e.target.value })}
          className={selectCls}
        >
          <option value="">Select template…</option>
          {containerTemplates.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.display_name} ({ct.container_kind?.display_name ?? ct.code})
            </option>
          ))}
        </select>
        <input
          value={node.code_suffix}
          onChange={(e) =>
            onChange({
              ...node,
              code_suffix: e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, ""),
            })
          }
          placeholder="suffix"
          className={inputSmCls}
        />
        <button
          onClick={() =>
            onChange({
              ...node,
              children: [
                ...children,
                { template_id: "", code_suffix: "", children: [] },
              ],
            })
          }
          className="text-xs font-semibold text-black dark:text-white flex-shrink-0 px-2"
        >
          + child
        </button>
        {!isRoot && onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-1"
          >
            ×
          </button>
        )}
      </div>
      {children.map((child, i) => (
        <NodeEditor
          key={i}
          node={child}
          onChange={(updated) => {
            const next = [...children];
            next[i] = updated;
            onChange({ ...node, children: next });
          }}
          containerTemplates={containerTemplates}
          depth={depth + 1}
          onRemove={() =>
            onChange({
              ...node,
              children: children.filter((_, idx) => idx !== i),
            })
          }
        />
      ))}
    </div>
  );
}

function InstantiateForm({
  templateId,
  onDone,
}: {
  templateId: string;
  onDone: () => void;
}) {
  const [codePrefix, setCodePrefix] = useState("");
  const [namePrefix, setNamePrefix] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [activate, setActivate] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      templateApi.instantiate(templateId, {
        code_prefix: codePrefix,
        display_name_prefix: namePrefix,
        visibility,
        activate,
      }) as Promise<InstantiateResult>,
  });

  const result = mutation.data;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border-2 border-black dark:border-white rounded-xl p-6 mb-6">
      <h3 className="text-base font-semibold text-black dark:text-white mb-1">
        Instantiate Hierarchy
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        Creates all containers in one transaction.
      </p>

      {mutation.error && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          {(mutation.error as Error).message}
        </div>
      )}

      {result ? (
        <div>
          <div className="px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 mb-4">
            <p className="text-sm font-semibold text-black dark:text-white m-0 mb-2">
              Created {result.containers_created} containers
            </p>
            {result.containers.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {c.path}
                </span>
                <span className="text-xs text-neutral-400">→</span>
                <span className="text-xs text-black dark:text-white">
                  {c.display_name}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                    c.status === "active"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {c.status}
                </span>
                {c.roles_created > 0 && (
                  <span className="text-[10px] text-neutral-400">
                    {c.roles_created} roles
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={onDone}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Code Prefix *
              </label>
              <input
                value={codePrefix}
                onChange={(e) =>
                  setCodePrefix(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                  )
                }
                placeholder="acme"
                className={inputCls}
              />
              <p className="text-[11px] text-neutral-400 m-0">
                → {codePrefix || "prefix"}_hq, {codePrefix || "prefix"}
                _engineering…
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Display Name Prefix *
              </label>
              <input
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                placeholder="Acme Corp"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className={inputCls}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={activate}
                  onClick={() => setActivate(!activate)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activate ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${activate ? "translate-x-[18px] bg-white dark:bg-black" : "translate-x-[3px] bg-white dark:bg-black"}`}
                  />
                </button>
                <span className="text-[13px] text-neutral-700 dark:text-neutral-300 font-medium">
                  Activate after creation
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onDone}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !codePrefix || !namePrefix}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
            >
              {mutation.isPending ? "Creating…" : "Create Hierarchy"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function InstantiatedContainers() {
  const containersQuery = useQuery({
    queryKey: ["admin", "containers", "all"],
    queryFn: async () => {
      const token = localStorage.getItem("use_token");
      const res = await fetch(
        `${import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000"}/api/hierarchy/containers`,
        {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const containers = (containersQuery.data ?? []) as Array<{
    id: string;
    code: string;
    display_name: string;
    path: string;
    status: string;
    parent_container_id: string | null;
    origin_type?: string;
  }>;

  if (containers.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-black dark:text-white mb-4">
        Containers ({containers.length})
      </h2>

      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Path
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Display Name
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                ID
              </th>
            </tr>
          </thead>
          <tbody>
            {containers
              .slice()
              .sort((a, b) => a.path.localeCompare(b.path))
              .map((c) => {
                const depth = (c.path.match(/\./g) || []).length;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 dark:border-neutral-900 last:border-b-0"
                  >
                    <td
                      className="px-4 py-2.5 text-sm font-mono text-neutral-600 dark:text-neutral-400"
                      style={{ paddingLeft: `${16 + depth * 20}px` }}
                    >
                      {depth > 0 && (
                        <span className="text-neutral-300 dark:text-neutral-700 mr-2">
                          └
                        </span>
                      )}
                      {c.path.split(".").pop()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-black dark:text-white">
                      {c.display_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase ${
                          c.status === "active"
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "border border-neutral-300 dark:border-neutral-700 text-neutral-500"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-neutral-400 dark:text-neutral-600">
                      {c.id.slice(0, 8)}…
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
