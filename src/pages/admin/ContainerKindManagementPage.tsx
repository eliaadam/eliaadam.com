import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateApi } from "../../lib/system";
import type { ContainerKind } from "../../lib/template-types";
import { InstantiationRuleEditor } from "./InstantiationRuleEditor";

const keys = {
  kinds: ["admin", "containerKinds"] as const,
};

export default function ContainerKindManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const kindsQuery = useQuery({
    queryKey: keys.kinds,
    queryFn: () => templateApi.listKinds() as Promise<ContainerKind[]>,
  });

  const kinds = kindsQuery.data ?? [];

  return (
    <div className="p-8 max-w-[900px]">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Container Kinds
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Define what types of containers can exist: organization, department,
            team, project.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
        >
          {showCreate ? "Cancel" : "+ New Kind"}
        </button>
      </header>

      {showCreate && <KindForm onDone={() => setShowCreate(false)} />}

      {kindsQuery.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {!kindsQuery.isLoading && kinds.length === 0 && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          No container kinds yet.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {kinds.map((kind) => (
          <div key={kind.id}>
            {editingId === kind.id ? (
              <KindForm existing={kind} onDone={() => setEditingId(null)} />
            ) : (
              <KindCard
                kind={kind}
                onEdit={() => {
                  setEditingId(kind.id);
                  setShowCreate(false);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KindCard({
  kind,
  onEdit,
}: {
  kind: ContainerKind;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => templateApi.deleteKind(kind.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.kinds }),
  });

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-black dark:text-white m-0">
              {kind.display_name}
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
              {kind.code}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${kind.status === "active" ? "bg-black dark:bg-white" : "bg-neutral-400"}`}
            />
          </div>
          {kind.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
              {kind.description}
            </p>
          )}
          <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 mt-1 m-0">
            {kind.id}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-4">
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
            <>
              <button
                onClick={() => setShowRules((s) => !s)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                {showRules ? "Hide Rules" : "Rules"}
              </button>
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {showRules && (
        <InstantiationRuleEditor target="kind" targetId={kind.id} />
      )}
    </div>
  );
}

function KindForm({
  existing,
  onDone,
}: {
  existing?: ContainerKind;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  const mutation = useMutation({
    mutationFn: () => {
      if (existing)
        return templateApi.updateKind(existing.id, {
          name,
          display_name: displayName,
          description: description || undefined,
        });
      return templateApi.createKind({
        code,
        name,
        display_name: displayName,
        description: description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.kinds });
      onDone();
    },
  });

  const fieldErrors = (
    mutation.error as { errors?: Record<string, string[]> } | null
  )?.errors;
  const fe = (f: string) => fieldErrors?.[f]?.[0] ?? null;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors border-neutral-300 dark:border-neutral-700";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-4">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {existing ? "Edit Kind" : "Create Container Kind"}
      </h3>

      {mutation.error && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "An unexpected error occurred."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {!existing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Code *
            </label>
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              placeholder="organization"
              className={inputCls}
            />
            {fe("code") && (
              <p className="text-xs text-black dark:text-white font-medium m-0">
                {fe("code")}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organization"
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
            placeholder="Organization"
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
            mutation.isPending || !name || !displayName || (!existing && !code)
          }
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {mutation.isPending ? "Saving…" : existing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}
