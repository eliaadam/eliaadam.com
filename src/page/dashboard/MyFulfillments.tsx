import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, PackageSearch } from "lucide-react";
import {
  sdk,
  type Fulfillment,
  type FulfillmentStatus,
} from "../../lib/sdk";

/**
 * Buyer-side, read-only tracking view — the direct answer to "how do
 * I actually get what I bought." Purely derivative: every status
 * shown here comes from either the vendor's own FulfillmentDashboard
 * actions or logistics' own automatic best-effort callbacks (see
 * capabilities.core.logistics' own shipment_service.py) — nothing on
 * this page writes anything.
 *
 * digital's own "completed" detail payload is shown as a generic
 * key-value dump, not a polished "Download" button or similar — the
 * real shape of that payload (whatever listing.metadata carried
 * through) was never confirmed this session (see capabilities.core.
 * fulfillment's own handlers.py module docstring on this exact gap).
 * Showing whatever keys are actually there is honest; guessing at a
 * specific key name like "download_url" would not be.
 */

const STATUS_STYLES: Record<FulfillmentStatus, string> = {
  completed: "bg-black text-white dark:bg-white dark:text-black",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function statusLabel(item: Fulfillment): string {
  if (item.status === "completed") {
    if (item.fulfillment_type === "digital") return "access granted";
    if (item.fulfillment_type === "physical") return "delivered";
    return "completed";
  }
  if (item.status === "in_progress") {
    if (item.fulfillment_type === "physical") return "shipping";
    return "in progress";
  }
  if (item.status === "failed") return "needs attention";
  if (item.fulfillment_type === "service") return "awaiting scheduling";
  return "pending";
}

function typeLabel(type: Fulfillment["fulfillment_type"]): string {
  if (type === "digital") return "Digital";
  if (type === "physical") return "Physical";
  return "Service";
}

export function MyFulfillments() {
  const { data: fulfillments, isLoading } = useQuery({
    queryKey: ["fulfillment", "mine"],
    queryFn: () => sdk.fulfillment.listMyFulfillments(),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">
        What you've bought
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Track access, service bookings, and deliveries for everything
        you've purchased.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {fulfillments && fulfillments.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <PackageSearch
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">Nothing to track yet</p>
        </div>
      )}

      {fulfillments && fulfillments.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {fulfillments.map((item) => (
            <FulfillmentRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FulfillmentRow({ item }: { item: Fulfillment }) {
  const [expanded, setExpanded] = useState(false);

  const { data: listing } = useQuery({
    queryKey: ["surfacing", "listing", item.listing_id],
    queryFn: () => sdk.surfacing.getListing(item.listing_id),
  });

  const shipmentId =
    typeof item.detail.shipment_id === "string"
      ? item.detail.shipment_id
      : null;

  const digitalDetailEntries =
    item.status === "completed" && item.fulfillment_type === "digital"
      ? Object.entries(item.detail)
      : [];

  const canExpand = Boolean(shipmentId) || digitalDetailEntries.length > 0;

  return (
    <li className="px-4 py-3.5">
      <div
        className={`flex items-center justify-between gap-3 ${canExpand ? "cursor-pointer" : ""}`}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {listing?.title ?? "Loading…"}
          </p>
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

        <div className="flex flex-none items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
          >
            {statusLabel(item)}
          </span>
          {canExpand &&
            (expanded ? (
              <ChevronUp size={15} className="text-neutral-400" />
            ) : (
              <ChevronDown size={15} className="text-neutral-400" />
            ))}
        </div>
      </div>

      {expanded && shipmentId && <ShipmentTracking shipmentId={shipmentId} />}

      {expanded && digitalDetailEntries.length > 0 && (
        <div className="mt-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <dl className="flex flex-col gap-1">
            {digitalDetailEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <dt className="flex-none font-medium text-neutral-500 dark:text-neutral-500">
                  {key}
                </dt>
                <dd className="truncate text-neutral-700 dark:text-neutral-300">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}

function ShipmentTracking({ shipmentId }: { shipmentId: string }) {
  const { data: shipment } = useQuery({
    queryKey: ["logistics", "shipment", shipmentId],
    queryFn: () => sdk.logistics.getShipment(shipmentId),
  });

  const { data: events } = useQuery({
    queryKey: ["logistics", "shipment-events", shipmentId],
    queryFn: () => sdk.logistics.listShipmentEvents(shipmentId),
  });

  return (
    <div className="mt-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      {shipment && (
        <p className="text-xs font-medium">
          Shipment status:{" "}
          <span className="capitalize">
            {shipment.status.replace("_", " ")}
          </span>
        </p>
      )}

      {events && events.length > 0 && (
        <ol className="mt-2 flex flex-col gap-2 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          {events.map((e) => (
            <li key={e.id} className="text-xs">
              <p className="font-medium capitalize text-neutral-700 dark:text-neutral-300">
                {e.status.replace("_", " ")}
              </p>
              {e.occurred_at && (
                <p className="text-neutral-500 dark:text-neutral-500">
                  {new Date(e.occurred_at).toLocaleString()}
                </p>
              )}
              {e.note && (
                <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                  {e.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {events && events.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
          No tracking updates yet.
        </p>
      )}
    </div>
  );
}
