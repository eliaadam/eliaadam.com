import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import { sdk, type Fulfillment, type FulfillmentStatus } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { useContainer } from "../../components/context/ContainerContext";
import { FulfillmentDetail } from "./FulfillmentTracking";

/**
 * Vendor-side management view for capabilities.core.fulfillment —
 * matches FulfillmentCapability's own navigation().route="fulfillment"
 * exactly (see domains/capability/manifests/fulfillment_capability.py).
 *
 * PHYSICAL FULFILLMENTS DEFER TO LOGISTICS ENTIRELY once a real
 * shipment exists — start-progress/complete/fail are hidden for those
 * (see isPhysicalWithShipment below), showing the live shipment
 * status inline instead. Earlier versions of this dashboard showed
 * these three actions for every fulfillment type uniformly, which let
 * a vendor manually mark a physical fulfillment "completed" with a
 * single click — completely bypassing the real, honest path (a
 * carrier actually recording a "delivered" ShipmentEvent, which
 * triggers logistics' own callback into fulfillment.complete()).
 * That gave a physical shipment two independent, inconsistent paths
 * to "completed": the real one and a shortcut that could fire before
 * the shipment was ever even dispatched. digital/service are
 * unaffected — digital is already terminal (completed) the instant
 * it's created, so it never reached this branch anyway; service has
 * no other path to completion at all and keeps the manual actions as
 * its only route forward.
 *
 * PERMISSION GATING: no useCanManageFulfillment-style hook is used
 * here — I haven't confirmed one exists (unlike
 * useCanManageInventory/useCanManageMarketplaceListings, both
 * directly seen this session). The backend itself currently gates
 * start-progress/complete/fail by raw container membership, not yet
 * a real manifest-declared permission (see fulfillment_capability.py
 * 's own docstring on this gap). Until both sides are confirmed
 * wired together, this page relies on the backend's own 403 response
 * — caught via handle403(), same pattern ContainerSettings.tsx's own
 * avatar/policy mutations already establish — rather than guessing at
 * a hook that may not exist.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

function statusClasses(status: FulfillmentStatus): string {
  if (status === "completed") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "in_progress") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"; // pending
}

function typeLabel(type: Fulfillment["fulfillment_type"]): string {
  if (type === "digital") return "Digital";
  if (type === "physical") return "Physical";
  return "Service";
}

export function FulfillmentDashboard() {
  const { currentContainerId } = useContainer();
  const [forbiddenAction, setForbiddenAction] = useState<string | null>(null);

  const { data: fulfillments, isLoading } = useQuery({
    queryKey: ["fulfillment", "for-container", currentContainerId],
    queryFn: () => sdk.fulfillment.listForContainer(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — fulfillments belong to whichever container
        you're currently in.
      </p>
    );
  }

  const pending = fulfillments?.filter((f) => f.status === "pending") ?? [];
  const inProgress =
    fulfillments?.filter((f) => f.status === "in_progress") ?? [];
  const completed = fulfillments?.filter((f) => f.status === "completed") ?? [];
  const failed = fulfillments?.filter((f) => f.status === "failed") ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Fulfillment</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        What this container owes its buyers — digital access, service bookings,
        and physical shipments.
      </p>

      {forbiddenAction && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          Only a member of this container may {forbiddenAction}.
        </p>
      )}

      {isLoading && (
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {fulfillments && fulfillments.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm font-medium">No fulfillments yet</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            These are created automatically whenever a buyer purchases something
            this container sells through the marketplace.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <FulfillmentSection
          title="Needs action"
          items={pending}
          onForbidden={setForbiddenAction}
        />
      )}
      {inProgress.length > 0 && (
        <FulfillmentSection
          title="In progress"
          items={inProgress}
          onForbidden={setForbiddenAction}
        />
      )}
      {completed.length > 0 && (
        <FulfillmentSection
          title="Completed"
          items={completed}
          onForbidden={setForbiddenAction}
        />
      )}
      {failed.length > 0 && (
        <FulfillmentSection
          title="Failed"
          items={failed}
          onForbidden={setForbiddenAction}
        />
      )}
    </div>
  );
}

function FulfillmentSection({
  title,
  items,
  onForbidden,
}: {
  title: string;
  items: Fulfillment[];
  onForbidden: (action: string) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        {title}
      </p>
      <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((item) => (
          <FulfillmentRow key={item.id} item={item} onForbidden={onForbidden} />
        ))}
      </ul>
    </div>
  );
}

function FulfillmentRow({
  item,
  onForbidden,
}: {
  item: Fulfillment;
  onForbidden: (action: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showFailForm, setShowFailForm] = useState(false);
  const [reason, setReason] = useState("");

  // Resolves listing.title for display — a per-row lookup, but
  // TanStack Query dedupes/caches by queryKey, so multiple
  // fulfillments for the same listing only fetch it once.
  const { data: listing } = useQuery({
    queryKey: ["surfacing", "listing", item.listing_id],
    queryFn: () => sdk.surfacing.getListing(item.listing_id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["fulfillment", "for-container"],
    });

  const handle403 = (action: string) => (err: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      onForbidden(action);
    }
  };

  const startProgressMutation = useMutation({
    mutationFn: () => sdk.fulfillment.startProgress(item.id),
    onSuccess: invalidate,
    onError: handle403("start progress on this fulfillment"),
  });

  const completeMutation = useMutation({
    mutationFn: () => sdk.fulfillment.completeFulfillment(item.id),
    onSuccess: invalidate,
    onError: handle403("complete this fulfillment"),
  });

  const failMutation = useMutation({
    mutationFn: () => sdk.fulfillment.failFulfillment(item.id, reason),
    onSuccess: () => {
      setShowFailForm(false);
      setReason("");
      invalidate();
    },
    onError: handle403("fail this fulfillment"),
  });

  const isTerminal = item.status === "completed" || item.status === "failed";
  const isPhysicalWithShipment =
    item.fulfillment_type === "physical" &&
    typeof item.detail.shipment_id === "string";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {listing?.title ?? "Loading…"}
            </p>
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(item.status)}`}
            >
              {item.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
            {typeLabel(item.fulfillment_type)}
            {item.created_at &&
              ` · ${new Date(item.created_at).toLocaleDateString()}`}
          </p>
          {item.status === "failed" &&
            typeof item.detail.failure_reason === "string" && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {item.detail.failure_reason}
              </p>
            )}
        </div>

        {!isTerminal && !isPhysicalWithShipment && (
          <div className="flex flex-none items-center gap-2">
            {item.status === "pending" && (
              <button
                type="button"
                onClick={() => startProgressMutation.mutate()}
                disabled={startProgressMutation.isPending}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                <PlayCircle size={13} />
                Start progress
              </button>
            )}
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="flex items-center gap-1 rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              <CheckCircle2 size={13} />
              Complete
            </button>
            <button
              type="button"
              onClick={() => setShowFailForm((v) => !v)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <XCircle size={13} />
              Mark failed
            </button>
          </div>
        )}
      </div>

      {isPhysicalWithShipment && !isTerminal && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Owned by Logistics from here — this completes automatically once the
            carrier records delivery, not from this dashboard.
          </p>
          <div className="mt-2">
            <FulfillmentDetail fulfillment={item} />
          </div>
        </div>
      )}

      {showFailForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-900/10">
          <input
            className={inputClass}
            placeholder="Why did this fail?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            onClick={() => failMutation.mutate()}
            disabled={!reason.trim() || failMutation.isPending}
            className="flex-none rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {failMutation.isPending ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setShowFailForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}
