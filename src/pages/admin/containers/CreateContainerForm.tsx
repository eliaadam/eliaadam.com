import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maicore, templateApi } from "../../../lib/maicore";
import type {
  Container,
  ContainerVisibility,
  MaicoreValidationError,
} from "../../../lib/maicore-sdk";
import { containerKeys } from "./queryKeys";

export function CreateContainerForm({
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
  const [visibility, setVisibility] = useState<ContainerVisibility>("private");

  const kindsQuery = useQuery({
    queryKey: containerKeys.containerKinds,
    queryFn: () =>
      templateApi.listKinds() as Promise<
        Array<{ id: string; code: string; display_name: string }>
      >,
  });
  const kinds = kindsQuery.data ?? [];

  // Auto-generate slug from code
  const handleCodeChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setCode(clean);
    if (!slug || slug === code.replace(/_/g, "-")) {
      setSlug(clean.replace(/_/g, "-"));
    }
  };

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
      queryClient.invalidateQueries({ queryKey: containerKeys.all });
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
    "w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6 mb-6">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {parentId ? "Create Child Container" : "Create Root Container"}
      </h3>

      {errorMessage && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          ! {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
            onChange={(e) => setVisibility(e.target.value as ContainerVisibility)}
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
            createMutation.isPending || !code || !slug || !displayName || !kindId
          }
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {createMutation.isPending ? "Creating…" : "Create Container"}
        </button>
      </div>
    </div>
  );
}
