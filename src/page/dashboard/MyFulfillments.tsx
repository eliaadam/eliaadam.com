import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, PackageSearch } from "lucide-react";
import { sdk, type Fulfillment } from "../../lib/sdk";
import {
  FULFILLMENT_STATUS_STYLES,
  statusLabel,
  FulfillmentDetail,
} from "./FulfillmentTracking";

/**
 * Buyer-side, read-only tracking view — the direct answer to "how do
 * I actually get what I bought." Purely derivative: every status
 * shown here comes from either the vendor's own FulfillmentDashboard
 * actions or logistics' own automatic best-effort callbacks (see
 * capabilities.core.logistics' own shipment_service.py) — nothing on
 * this page writes anything.
 *
 * The expandable content itself (shipment tracking timeline / digital
 * access detail dump) is the shared FulfillmentDetail component,
 * extracted once MyOrders.tsx needed the same view via an order
 * line's own fulfillment_id — this page still owns its own status
 * badge in the row header (it already has the fetched Fulfillment
 * object directly from listMyFulfillments(), no need to re-fetch).
 *
 * digital's own "completed" detail payload is shown as a generic
 * key-value dump, not a polished "Download" button or similar — the
 * real shape of that payload (whatever listing.metadata carried
 * through) was never confirmed this session (see capabilities.core.
 * fulfillment's own handlers.py module docstring on this exact gap).
 * Showing whatever keys are actually there is honest; guessing at a
 * specific key name like "download_url" would not be.
 */

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
        Track access, service bookings, and deliveries for everything you've
        purchased.
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
  const hasDigitalDetail =
    item.status === "completed" &&
    item.fulfillment_type === "digital" &&
    Object.keys(item.detail).length > 0;
  const canExpand = Boolean(shipmentId) || hasDigitalDetail;

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
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${FULFILLMENT_STATUS_STYLES[item.status]}`}
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

      {expanded && (
        <div className="mt-3">
          <FulfillmentDetail fulfillment={item} />
        </div>
      )}
    </li>
  );
}
