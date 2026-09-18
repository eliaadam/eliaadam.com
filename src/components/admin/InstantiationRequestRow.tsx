import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useCanApproveRootInstantiation } from "../../lib/hooks/useCanApproveRootInstantiation";
import { ApiError } from "../../lib/query/Api";
import { type InstantiationRequest, sdk } from "../../lib/sdk";

export function InstantiationRequestRow({
  request,
  onApprove,
  onReject,
  isDeciding,
  error,
  showTemplateCode = false,
}: {
  request: InstantiationRequest;
  onApprove: (reason: string) => void;
  onReject: (reason: string) => void;
  isDeciding: boolean;
  error: unknown;
  showTemplateCode?: boolean;
}) {
  const [reason, setReason] = useState("");

  const { data: requester } = useQuery({
    queryKey: ["actor", request.requester_actor_id],
    queryFn: () => sdk.identity.getActor(request.requester_actor_id),
  });

  const isRoot = request.payload.parent_container_id === null;
  const forbidden = error instanceof ApiError && error.status === 403;

  const { data: canApproveRoot, isLoading: checkingPermission } =
    useCanApproveRootInstantiation();
  // undefined while still checking — only a real false is "blocked".
  const rootBlocked = isRoot && canApproveRoot === false;

  // Sub-container ownership has no permission code to pre-check at
  // all (see useCanApproveRootInstantiation's own docstring) — the
  // ONLY honest way to learn "can't act on this one" is a real 403
  // coming back from an actual attempt. Once that happens, latch it:
  // don't go back to showing enabled buttons on a later re-render
  // even if the parent's own error prop later clears.
  const [subContainerBlocked, setSubContainerBlocked] = useState(false);
  useEffect(() => {
    if (!isRoot && forbidden) {
      setSubContainerBlocked(true);
    }
  }, [isRoot, forbidden]);

  // True once we KNOW for certain — either a real permission check
  // (root) or a real 403 already happened (sub-container) — that this
  // actor cannot decide this request. Nothing renders below the
  // requester's own name/summary in that case: no buttons, no
  // explanatory message, no reason input.
  const knownBlocked = rootBlocked || subContainerBlocked;

  const disabled = isDeciding || checkingPermission;

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {requester?.display_name ?? request.requester_actor_id}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
            {showTemplateCode && `${request.payload.template_code} · `}
            {isRoot ? "New root container" : "Sub-container"}
            {request.payload.name ? ` · "${request.payload.name}"` : ""}
            {request.requested_at &&
              ` · ${new Date(request.requested_at).toLocaleString()}`}
          </p>
        </div>
        {!knownBlocked && (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => onReject(reason)}
              disabled={disabled}
              aria-label="Reject"
              className="rounded-md border border-neutral-300 p-1.5 text-neutral-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:border-neutral-700 dark:hover:text-red-400"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => onApprove(reason)}
              disabled={disabled}
              aria-label="Approve"
              className="rounded-md bg-black p-1.5 text-white transition-colors hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-black"
            >
              <Check size={14} />
            </button>
          </div>
        )}
      </div>

      {request.payload.form_answers && (
        <div className="rounded-md bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          {Object.entries(request.payload.form_answers).map(([key, value]) => (
            <p key={key}>
              <span className="font-medium">{key}:</span> {String(value)}
            </p>
          ))}
        </div>
      )}

      {!knownBlocked && (
        <input
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Reason (optional — shown to the requester)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}

      {isRoot && checkingPermission && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Checking your permission…
        </p>
      )}
      {!isRoot && !subContainerBlocked && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Sub-container request — only that container's real owner can decide
          this. You'll see a permission error if that isn't you.
        </p>
      )}
      {Boolean(error) && !forbidden && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't decide this request — try again.
        </p>
      )}
    </li>
  );
}
