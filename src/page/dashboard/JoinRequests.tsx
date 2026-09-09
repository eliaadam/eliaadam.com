import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { sdk } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";

/**
 * No separate "am I the owner" check exists to query up front — the
 * backend's owner check is a direct role-assignment lookup, not the
 * usual Gate/`authorize()` path (Container is never a licensed
 * feature, so `authorize()` would always say no here, incorrectly).
 * This page just attempts the fetch and shows a clear message on a
 * 403, rather than trying to predict the answer client-side.
 */
export function JoinRequests() {
  const { containerId } = useParams<{ containerId: string }>();
  const queryClient = useQueryClient();

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["container", "join-requests", containerId],
    queryFn: () => sdk.container.listJoinRequests(containerId!, "pending"),
    enabled: Boolean(containerId),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["container", "join-requests", containerId],
    });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      sdk.container.approveJoinRequest(requestId),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      sdk.container.rejectJoinRequest(requestId),
    onSuccess: invalidate,
  });

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/containers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to containers
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">Join requests</h1>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {error instanceof ApiError && error.status === 403 && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          Only this container's owner can review join requests.
        </p>
      )}
      {error && !(error instanceof ApiError && error.status === 403) && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Something went wrong loading requests.
        </p>
      )}

      {requests && requests.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          No pending requests.
        </p>
      )}

      {requests && requests.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {requests.map((r) => (
            <JoinRequestRow
              key={r.id}
              actorId={r.actor_id}
              requestedAt={r.requested_at}
              onApprove={() => approveMutation.mutate(r.id)}
              onReject={() => rejectMutation.mutate(r.id)}
              isDeciding={
                (approveMutation.isPending &&
                  approveMutation.variables === r.id) ||
                (rejectMutation.isPending && rejectMutation.variables === r.id)
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function JoinRequestRow({
  actorId,
  requestedAt,
  onApprove,
  onReject,
  isDeciding,
}: {
  actorId: string;
  requestedAt: string | null;
  onApprove: () => void;
  onReject: () => void;
  isDeciding: boolean;
}) {
  const { data: actor } = useQuery({
    queryKey: ["actor", actorId],
    queryFn: () => sdk.identity.getActor(actorId),
  });

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {actor?.display_name ?? actorId}
        </p>
        {requestedAt && (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
            Requested {new Date(requestedAt).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={onReject}
          disabled={isDeciding}
          aria-label="Reject"
          className="rounded-md border border-neutral-300 p-1.5 text-neutral-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60 dark:border-neutral-700 dark:hover:text-red-400"
        >
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isDeciding}
          aria-label="Approve"
          className="rounded-md bg-black p-1.5 text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          <Check size={14} />
        </button>
      </div>
    </li>
  );
}
