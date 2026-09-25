import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { sdk, type Order, type OrderStatus } from "../../lib/sdk";
import { FulfillmentTracking } from "./FulfillmentTracking";

/**
 * Buyer-side "My Orders" — the grouping view over one or more
 * checkout lines. Purely read-only, same as MyFulfillments.tsx; the
 * real detail behind each line (price paid, currency) lives on
 * surfacing's own Purchase record, reachable via line_result.
 * purchase_id — not duplicated here (see capabilities.core.order's
 * own domain/entities.py module docstring on this "thin grouping,
 * not a re-implementation" design).
 *
 * Each line now deep-links into its own Fulfillment record, when one
 * exists, via line_result.fulfillment_id (see capabilities.core.
 * order's own OrderLineResult.fulfillment_id docstring for exactly
 * how that gets there — captured from data order already received
 * from surfacing.purchase() but previously discarded; no new
 * surfacing endpoint was needed). fulfillment_id is only ever set
 * for a core.inventory-backed purchase (the only source capability
 * capabilities.core.fulfillment registers a handler for) — null for
 * a subscription or any other source, in which case a line stays
 * unexpandable.
 */

const STATUS_STYLES: Record<OrderStatus, string> = {
  completed: "bg-black text-white dark:bg-white dark:text-black",
  partially_failed:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  completed: "completed",
  partially_failed: "needs attention",
  failed: "failed",
};

export function MyOrders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["order", "mine"],
    queryFn: () => sdk.order.listMyOrders(),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">My orders</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every checkout, grouped — drill into a line for the individual purchase
        and delivery status behind it.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {orders && orders.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Receipt
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No orders yet</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(order.line_results.length > 1);

  return (
    <li className="px-4 py-3.5">
      <div
        className="flex cursor-pointer items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {order.line_results.length}{" "}
            {order.line_results.length === 1 ? "item" : "items"}
          </p>
          {order.created_at && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-none items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          {expanded ? (
            <ChevronUp size={15} className="text-neutral-400" />
          ) : (
            <ChevronDown size={15} className="text-neutral-400" />
          )}
        </div>
      </div>

      {expanded && (
        <ul className="mt-3 flex flex-col gap-2 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          {order.line_results.map((line, i) => (
            <OrderLineRow
              key={line.purchase_id ?? `${order.id}-${i}`}
              line={line}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function OrderLineRow({ line }: { line: Order["line_results"][number] }) {
  const [showFulfillment, setShowFulfillment] = useState(false);

  const { data: listing } = useQuery({
    queryKey: ["surfacing", "listing", line.listing_id],
    queryFn: () => sdk.surfacing.getListing(line.listing_id),
  });

  const isClean =
    line.purchase_status === "completed" ||
    line.purchase_status === "subscribed";
  const canExpand = Boolean(line.fulfillment_id);

  return (
    <li className="text-xs">
      <div
        className={`flex items-center justify-between gap-2 ${canExpand ? "cursor-pointer" : ""}`}
        onClick={() => canExpand && setShowFulfillment((v) => !v)}
      >
        <p className="truncate font-medium text-neutral-700 dark:text-neutral-300">
          {listing?.title ?? "Loading…"}
        </p>
        <div className="flex flex-none items-center gap-1.5">
          <span
            className={
              isClean
                ? "text-neutral-500 dark:text-neutral-500"
                : "font-medium text-red-600 dark:text-red-400"
            }
          >
            {line.purchase_status.replace("_", " ")}
          </span>
          {canExpand &&
            (showFulfillment ? (
              <ChevronUp size={12} className="text-neutral-400" />
            ) : (
              <ChevronDown size={12} className="text-neutral-400" />
            ))}
        </div>
      </div>

      {!isClean && line.error && (
        <p className="mt-0.5 text-red-600 dark:text-red-400">{line.error}</p>
      )}

      {showFulfillment && line.fulfillment_id && (
        <div className="mt-2">
          <FulfillmentTracking fulfillmentId={line.fulfillment_id} />
        </div>
      )}
    </li>
  );
}
