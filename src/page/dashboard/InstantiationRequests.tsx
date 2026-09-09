import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sdk, type InstantiationRequest } from "../../lib/sdk";
import { useContainer } from "../../components/context/ContainerContext";
import { InstantiationRequestRow } from "../../components/admin/InstantiationRequestRow";

export function InstantiationRequests() {
  const { templateCode } = useParams<{ templateCode: string }>();
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["provisioning", "instantiation-requests", templateCode],
    queryFn: () => sdk.provisioning.listInstantiationRequests(templateCode!),
    enabled: Boolean(templateCode),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["provisioning", "instantiation-requests", templateCode],
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
    <div className="max-w-xl">
      <Link
        to="/dashboard/templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to templates
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        Instantiation requests
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Pending requests to instantiate "{templateCode}".
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
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
            <InstantiationRequestRow
              key={r.id}
              request={r}
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
