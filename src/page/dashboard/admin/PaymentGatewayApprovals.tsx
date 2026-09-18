import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { ApiKeyRequest } from "../../../lib/sdk/domains/paymentGateway";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

/**
 * Platform-admin only (core.payment_gateway.issuance.approve) —
 * extracted from PaymentGateway.tsx's own former "Approvals" tab into
 * its own AdminHub-linked page, alongside every other platform-wide
 * admin destination (Actors, License a container, Payment reporting,
 * etc), rather than buried as a tab inside a container-scoped
 * dashboard page a normal user would also visit for their own
 * credentials/webhooks. Shown unconditionally rather than hidden
 * behind a client-side permission check — this app has no confirmed
 * frontend authorize()-style hook to gate on, so a user without the
 * real permission simply sees a clean 403 message if they open it.
 */
export function PaymentGatewayApprovals() {
  const queryClient = useQueryClient();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const {
    data: requests,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-gateway", "api-key-requests"],
    queryFn: () => sdk.paymentGateway.listApiKeyRequests("pending"),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment-gateway", "api-key-requests"],
    });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.paymentGateway.approveApiKeyRequest(id, reasonById[id]),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.paymentGateway.rejectApiKeyRequest(id, reasonById[id]),
    onSuccess: invalidate,
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">
        Payment gateway approvals
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Pending API key requests from containers whose kind requires approval
        before a key is issued.
      </p>

      <div className="mt-6">
        {isError && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You don't have permission to view pending API key requests.
          </p>
        )}

        {isLoading && !isError && (
          <div className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        )}

        {requests && requests.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
            No pending requests.
          </p>
        )}

        {requests && requests.length > 0 && (
          <ul className="flex flex-col gap-2">
            {requests.map((r: ApiKeyRequest) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <p className="text-sm font-medium">
                  {r.payload?.label ?? "API key request"}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  Requested by {r.requester_actor_id}
                </p>
                {r.payload?.form_answers && (
                  <pre className="overflow-x-auto rounded bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
                    {JSON.stringify(r.payload.form_answers, null, 2)}
                  </pre>
                )}
                <input
                  className={inputClass}
                  placeholder="Reason (optional)"
                  value={reasonById[r.id] ?? ""}
                  onChange={(e) =>
                    setReasonById((prev) => ({
                      ...prev,
                      [r.id]: e.target.value,
                    }))
                  }
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(r.id)}
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    className={primaryButtonClass}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate(r.id)}
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                    className="rounded-md px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
