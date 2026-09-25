import { useQuery } from "@tanstack/react-query";
import { sdk, type Fulfillment } from "../../lib/sdk";

/**
 * Shared fulfillment tracking pieces — used by both MyOrders.tsx (via
 * an order line's own fulfillment_id, see capabilities.core.order's
 * own OrderLineResult.fulfillment_id docstring) and
 * MyFulfillments.tsx (browsing fulfillments directly). Split in two
 * so each caller uses what actually fits:
 *
 * - FulfillmentDetail({ fulfillment }) — the expandable CONTENT only
 *   (shipment tracking timeline, or a digital access detail dump).
 *   Takes an already-fetched Fulfillment directly, no status badge
 *   of its own — for a caller (MyFulfillments.tsx) that already has
 *   the object and already shows its own status badge in a row
 *   header, so this stays the single source of truth for that badge.
 * - FulfillmentTracking({ fulfillmentId }) — the self-fetching
 *   wrapper, for a caller (MyOrders.tsx) that only has an id, not
 *   the object. Fetches the Fulfillment itself, shows its own status
 *   badge, then renders FulfillmentDetail for the rest.
 */

export function statusLabel(item: Fulfillment): string {
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

export const FULFILLMENT_STATUS_STYLES: Record<Fulfillment["status"], string> =
  {
    completed: "bg-black text-white dark:bg-white dark:text-black",
    in_progress:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    pending:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  };

export function FulfillmentDetail({
  fulfillment,
}: {
  fulfillment: Fulfillment;
}) {
  const shipmentId =
    typeof fulfillment.detail.shipment_id === "string"
      ? fulfillment.detail.shipment_id
      : null;

  const digitalDetailEntries =
    fulfillment.status === "completed" &&
    fulfillment.fulfillment_type === "digital"
      ? Object.entries(fulfillment.detail)
      : [];

  if (!shipmentId && digitalDetailEntries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {shipmentId && <ShipmentTracking shipmentId={shipmentId} />}

      {digitalDetailEntries.length > 0 && (
        <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
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
    </div>
  );
}

export function FulfillmentTracking({
  fulfillmentId,
}: {
  fulfillmentId: string;
}) {
  const { data: fulfillment, isLoading } = useQuery({
    queryKey: ["fulfillment", "detail", fulfillmentId],
    queryFn: () => sdk.fulfillment.getFulfillment(fulfillmentId),
  });

  if (isLoading || !fulfillment) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FULFILLMENT_STATUS_STYLES[fulfillment.status]}`}
        >
          {statusLabel(fulfillment)}
        </span>
        {fulfillment.status === "failed" &&
          typeof fulfillment.detail.failure_reason === "string" && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {fulfillment.detail.failure_reason}
            </span>
          )}
      </div>
      <FulfillmentDetail fulfillment={fulfillment} />
    </div>
  );
}

export function ShipmentTracking({ shipmentId }: { shipmentId: string }) {
  const { data: shipment } = useQuery({
    queryKey: ["logistics", "shipment", shipmentId],
    queryFn: () => sdk.logistics.getShipment(shipmentId),
  });

  const { data: events } = useQuery({
    queryKey: ["logistics", "shipment-events", shipmentId],
    queryFn: () => sdk.logistics.listShipmentEvents(shipmentId),
  });

  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
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
