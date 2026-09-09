import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sdk, type Visibility } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const POLICY_DEFAULTS = {
  default_visibility: "protected" as Visibility,
  allow_transfers: true,
  allow_invitations: true,
  default_member_role_code: "",
  maximum_depth: "",
  maximum_children: "",
  allowed_child_kinds: "",
};

/**
 * Every write here (policy changes, activate/suspend/archive/restore)
 * is owner-only server-side — but there's no endpoint to ask "am I
 * the owner" up front, the same situation as `JoinRequests.tsx`. This
 * page shows the form to any member (viewing policy only requires
 * membership) and surfaces a clear message on a 403 from an actual
 * write attempt, rather than trying to predict the answer client-side.
 */
export function ContainerSettings() {
  const { containerId } = useParams<{ containerId: string }>();
  const queryClient = useQueryClient();
  const [forbiddenAction, setForbiddenAction] = useState<string | null>(null);

  const { data: container, isLoading: containerLoading } = useQuery({
    queryKey: ["container", "detail", containerId],
    queryFn: () => sdk.container.getContainer(containerId!),
    enabled: Boolean(containerId),
  });

  const {
    data: policy,
    isLoading: policyLoading,
    error: policyError,
  } = useQuery({
    queryKey: ["container", "policy", containerId],
    queryFn: () => sdk.container.getContainerPolicy(containerId!),
    enabled: Boolean(containerId),
    retry: false,
  });

  const [form, setForm] = useState(POLICY_DEFAULTS);
  const [formInitialized, setFormInitialized] = useState(false);

  if (policy && !formInitialized) {
    setForm({
      default_visibility: policy.default_visibility,
      allow_transfers: policy.allow_transfers,
      allow_invitations: policy.allow_invitations,
      default_member_role_code: policy.default_member_role_code ?? "",
      maximum_depth: policy.maximum_depth?.toString() ?? "",
      maximum_children: policy.maximum_children?.toString() ?? "",
      allowed_child_kinds: policy.allowed_child_kinds.join(", "),
    });
    setFormInitialized(true);
  }

  const invalidateContainer = () =>
    queryClient.invalidateQueries({
      queryKey: ["container", "detail", containerId],
    });

  const handle403 = (action: string) => (err: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      setForbiddenAction(action);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.container.applyContainerPolicy(containerId!, {
        default_visibility: form.default_visibility,
        allow_transfers: form.allow_transfers,
        allow_invitations: form.allow_invitations,
        default_member_role_code: form.default_member_role_code || undefined,
        maximum_depth: form.maximum_depth
          ? Number(form.maximum_depth)
          : undefined,
        maximum_children: form.maximum_children
          ? Number(form.maximum_children)
          : undefined,
        allowed_child_kinds: form.allowed_child_kinds
          ? form.allowed_child_kinds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      setForbiddenAction(null);
      queryClient.invalidateQueries({
        queryKey: ["container", "policy", containerId],
      });
    },
    onError: handle403("update this container's policy"),
  });

  const activateMutation = useMutation({
    mutationFn: () => sdk.container.activateContainer(containerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidateContainer();
    },
    onError: handle403("activate this container"),
  });
  const suspendMutation = useMutation({
    mutationFn: () => sdk.container.suspendContainer(containerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidateContainer();
    },
    onError: handle403("suspend this container"),
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.container.archiveContainer(containerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidateContainer();
    },
    onError: handle403("archive this container"),
  });
  const restoreMutation = useMutation({
    mutationFn: () => sdk.container.restoreContainer(containerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidateContainer();
    },
    onError: handle403("restore this container"),
  });

  if (containerLoading || !container) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  const isMemberForbidden =
    policyError instanceof ApiError && policyError.status === 403;

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/containers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to containers
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        {container.display_name}
      </h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
        {container.slug} · {container.status}
      </p>

      {forbiddenAction && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          Only the container owner may {forbiddenAction}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(container.status === "draft" || container.status === "suspended") && (
          <button
            type="button"
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            Activate
          </button>
        )}
        {container.status === "active" && (
          <button
            type="button"
            onClick={() => suspendMutation.mutate()}
            disabled={suspendMutation.isPending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Suspend
          </button>
        )}
        {(container.status === "active" ||
          container.status === "suspended") && (
          <button
            type="button"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          >
            Archive
          </button>
        )}
        {container.status === "archived" && (
          <button
            type="button"
            onClick={() => restoreMutation.mutate()}
            disabled={restoreMutation.isPending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Restore
          </button>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold tracking-tight">Policy</h2>

      {policyLoading && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}
      {isMemberForbidden && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Only members of this container may view its policy.
        </p>
      )}
      {!policyLoading && !isMemberForbidden && policy === null && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          No policy set directly on this container yet — it currently inherits
          from an ancestor. Saving below creates one.
        </p>
      )}

      {!isMemberForbidden && !policyLoading && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="mt-3 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Visibility
            </label>
            <select
              className={inputClass}
              value={form.default_visibility}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  default_visibility: e.target.value as Visibility,
                }))
              }
            >
              <option value="public">
                Public — discoverable, join instantly
              </option>
              <option value="protected">
                Protected — discoverable, join by request/invite
              </option>
              <option value="private">Private — hidden, invite only</option>
            </select>
            {/*
              Single control, not two — `allow_public_join` is derived
              from visibility server-side now, never sent from here.
              See Templates.tsx's own note on the same collapse for
              the full explanation of what each value means for
              joining, not just discovery.
            */}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allow_transfers}
              onChange={(e) =>
                setForm((f) => ({ ...f, allow_transfers: e.target.checked }))
              }
            />
            Allow membership transfers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allow_invitations}
              onChange={(e) =>
                setForm((f) => ({ ...f, allow_invitations: e.target.checked }))
              }
            />
            Allow invitations
          </label>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Default role for new members
            </label>
            <input
              className={inputClass}
              placeholder="member"
              value={form.default_member_role_code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  default_member_role_code: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Max depth
              </label>
              <input
                type="number"
                min="0"
                className={inputClass}
                placeholder="No limit"
                value={form.maximum_depth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maximum_depth: e.target.value }))
                }
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Max children
              </label>
              <input
                type="number"
                min="0"
                className={inputClass}
                placeholder="No limit"
                value={form.maximum_children}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maximum_children: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Allowed child kinds (comma-separated codes, blank = any)
            </label>
            <input
              className={inputClass}
              placeholder="e.g. team, project"
              value={form.allowed_child_kinds}
              onChange={(e) =>
                setForm((f) => ({ ...f, allowed_child_kinds: e.target.value }))
              }
            />
          </div>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="mt-1 self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {saveMutation.isPending ? "Saving…" : "Save policy"}
          </button>
        </form>
      )}
    </div>
  );
}
