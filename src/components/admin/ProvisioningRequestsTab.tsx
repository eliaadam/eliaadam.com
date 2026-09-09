import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { sdk, type InstantiationRequest } from "../../lib/sdk";
import { useContainer } from "../context/ContainerContext";
import { InstantiationRequestRow } from "./InstantiationRequestRow";

/**
 * The admin's aggregate queue — every pending instantiation request,
 * across every template, in one place. Distinct from
 * `InstantiationRequests.tsx` (per-template, reached from that
 * template's own "View requests" link) — this exists specifically so
 * a superadmin doesn't have to click into each template individually
 * to find out something's waiting.
 */
export function ProvisioningRequestsTab() {
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["provisioning", "all-instantiation-requests"],
    queryFn: () => sdk.provisioning.listAllInstantiationRequests(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["provisioning", "all-instantiation-requests"],
    });

  const approveMutation = useMutation({
    mutationFn: ({
      request,
      reason,
    }: {
      request: InstantiationRequest;
      reason: string;
    }) =>
      sdk.provisioning.approveInstantiationRequest(
        request.id,
        request.payload.parent_container_id === null
          ? (currentContainerId ?? undefined)
          : undefined,
        reason || undefined,
      ),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      request,
      reason,
    }: {
      request: InstantiationRequest;
      reason: string;
    }) =>
      sdk.provisioning.rejectInstantiationRequest(
        request.id,
        request.payload.parent_container_id === null
          ? (currentContainerId ?? undefined)
          : undefined,
        reason || undefined,
      ),
    onSuccess: invalidate,
  });

  return (
    <div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Every pending instantiation request, across every template.
      </p>

      {isLoading && (
        <div className="mt-4 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {requests && requests.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <ClipboardList
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">Nothing pending</p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {requests.map((r) => (
            <InstantiationRequestRow
              key={r.id}
              request={r}
              showTemplateCode
              onApprove={(reason) =>
                approveMutation.mutate({ request: r, reason })
              }
              onReject={(reason) =>
                rejectMutation.mutate({ request: r, reason })
              }
              isDeciding={
                (approveMutation.isPending &&
                  approveMutation.variables?.request.id === r.id) ||
                (rejectMutation.isPending &&
                  rejectMutation.variables?.request.id === r.id)
              }
              error={
                (approveMutation.isError &&
                  approveMutation.variables?.request.id === r.id) ||
                (rejectMutation.isError &&
                  rejectMutation.variables?.request.id === r.id)
                  ? (approveMutation.error ?? rejectMutation.error)
                  : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
