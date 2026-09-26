import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { sdk, type CarrierJobRequest, type CarrierJobRequestStatus } from "../../../lib/sdk";

/**
 * A carrier container's own inbox — requests asking it to take on a
 * job, wrapping the platform's own shared request/approval primitive
 * (domains.requests). Approving triggers the actual assignment/
 * creation atomically with the decision itself — see the backend's
 * own carrier_job_request_service.py module docstring; if the side
 * effect fails (e.g. an "existing shipment" request whose shipment
 * was claimed elsewhere in the meantime), the whole thing rolls back
 * and the request stays pending.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: CarrierJobRequestStatus): string {
  if (status === "approved") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
}

function describePayload(payload: Record<string, unknown>): string {
  if (payload.kind === "custom_job") {
    const parts = [
      payload.pickup_description,
      payload.dropoff_description,
      payload.cargo_description,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Custom job";
  }
  return `Shipment ${payload.shipment_id}`;
}

export function JobRequestsTab({ containerId }: { containerId: string }) {
  const [statusFilter, setStatusFilter] = useState<
    CarrierJobRequestStatus | "all"
  >("pending");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["logistics", "job-requests", containerId, statusFilter],
    queryFn: () =>
      sdk.logistics.listCarrierJobRequestsForCarrier(
        containerId,
        statusFilter === "all" ? undefined : statusFilter,
      ),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Job requests</p>
        <select
          className={`${inputClass} max-w-[9rem]`}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as CarrierJobRequestStatus | "all")
          }
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Inbox
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            Nothing here right now.
          </p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: CarrierJobRequest }) {
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["logistics", "job-requests"] });

  const approveMutation = useMutation({
    mutationFn: () => sdk.logistics.approveCarrierJobRequest(request.id),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.rejectCarrierJobRequest(request.id, reason || undefined),
    onSuccess: () => {
      setShowRejectForm(false);
      setReason("");
      invalidate();
    },
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(request.status)}`}
            >
              {request.status}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
            {describePayload(request.payload)}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
            Requested by {request.requester_actor_id}
          </p>
          {request.decision_reason && (
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
              "{request.decision_reason}"
            </p>
          )}
        </div>

        {request.status === "pending" && (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className={primaryButtonClass}
            >
              {approveMutation.isPending ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm((v) => !v)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {approveMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't approve this request — the referenced shipment may
          no longer be available.
        </p>
      )}

      {showRejectForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-900/10">
          <input
            className={inputClass}
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="flex-none rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {rejectMutation.isPending ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setShowRejectForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}
