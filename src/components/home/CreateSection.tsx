import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../lib/maicore";
import InstantiationGate from "./InstantiationGate";
import MyInstantiationRequests from "./MyInstantiationRequests";

export default function CreateSection() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["user", "hierarchyTemplates"],
    queryFn: () => userApi.listHierarchyTemplates(),
  });

  const templates = (templatesQuery.data ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    display_name: string;
    description: string | null;
    structure: any;
  }>;

  return (
    <div className="p-8 max-w-[900px]">
      <h1 className="text-2xl font-bold text-black dark:text-white mb-1">
        Create Organization
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Pick a template to create your organization with a pre-defined
        structure, roles, and policies.
      </p>

      {/* The user's own instantiation requests (pending approval, approved,
          rejected) — shown so a submitted request is visible and trackable. */}
      <MyInstantiationRequests />

      {templatesQuery.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          Loading templates…
        </p>
      )}

      {!templatesQuery.isLoading && templates.length === 0 && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          No templates available. Ask your system administrator to create
          hierarchy templates.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {templates.map((t) => (
          <div key={t.id}>
            <div
              onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
              className={`bg-white dark:bg-neutral-950 border rounded-xl p-5 cursor-pointer transition ${
                selectedId === t.id
                  ? "border-black dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
                    {t.display_name}
                  </h3>
                  {t.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mb-2">
                      {t.description}
                    </p>
                  )}
                  <StructurePreview node={t.structure} depth={0} />
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selectedId === t.id
                      ? "border-black dark:border-white"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {selectedId === t.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white" />
                  )}
                </div>
              </div>
            </div>

            {selectedId === t.id && (
              // Gate the whole-template instantiation. Ungated templates pass
              // straight through to the form; gated ones show requirements.
              <InstantiationGate templateId={t.id}>
                <InstantiateForm
                  templateId={t.id}
                  templateName={t.display_name}
                  onDone={() => {
                    setSelectedId(null);
                    queryClient.invalidateQueries({
                      queryKey: ["user", "memberships"],
                    });
                  }}
                />
              </InstantiationGate>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StructurePreview({ node, depth }: { node: any; depth: number }) {
  if (!node) return null;
  const children = node.children ?? [];
  const name =
    node.template_name ??
    node.code_suffix ??
    node.template_id?.slice(0, 8) ??
    "?";

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="text-neutral-400 dark:text-neutral-600 text-[11px]">
          {depth === 0 ? "◈" : "└"}
        </span>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {name}
        </span>
        {node.code_suffix && (
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-600">
            _{node.code_suffix}
          </span>
        )}
      </div>
      {children.map((c: any, i: number) => (
        <StructurePreview key={i} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function InstantiateForm({
  templateId,
  templateName,
  onDone,
}: {
  templateId: string;
  templateName: string;
  onDone: () => void;
}) {
  const [codePrefix, setCodePrefix] = useState("");
  const [namePrefix, setNamePrefix] = useState("");
  const [visibility, setVisibility] = useState("private");

  const mutation = useMutation({
    mutationFn: () =>
      userApi.instantiateTemplate(templateId, {
        code_prefix: codePrefix,
        display_name_prefix: namePrefix,
        visibility,
        activate: true,
      }),
  });

  const result = mutation.data as any;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border-2 border-black dark:border-white rounded-xl p-6 mt-3">
      <h3 className="text-base font-semibold text-black dark:text-white mb-1">
        Create from "{templateName}"
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        This will create all containers, apply policies, and set up roles
        automatically.
      </p>

      {mutation.isError && (
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
            {(result.containers ?? []).map((c: any) => (
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
                      : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {c.status}
                </span>
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
                Organization Code *
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
                Containers: {codePrefix || "code"}_hq, {codePrefix || "code"}
                _engineering…
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Organization Name *
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
                <option value="public">Public — anyone can discover</option>
                <option value="private">Private — invite only</option>
                <option value="restricted">Restricted</option>
              </select>
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
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
            >
              {mutation.isPending ? "Creating…" : "Create Organization"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
